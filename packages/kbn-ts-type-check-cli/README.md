# @kbn/ts-type-check-cli

Drives `node scripts/type_check`. Generates per-project `tsconfig.type_check.json`
files, runs `tsgo -b` over them, and optionally restores/uploads the resulting
`target/types` + `.tsbuildinfo` artifacts to GCS.

## Ramdisk mode (opt-in)

Cold full builds emit ~1.3 GB of declarations and `.tsbuildinfo` across ~1400
projects. Pointing each project's `target/types` at a tmpfs/RAM volume can shave
several minutes off a cold `tsc -b`. It is an **opt-in** mode — the path to a
pre-mounted RAM volume must be supplied; the CLI never auto-creates one.

### Enable

```sh
# flag
node scripts/type_check --ramdisk-types /Volumes/kibana-types

# or env var (must be a path; "1"/"true" is rejected)
export KBN_TYPECHECK_RAMDISK=/Volumes/kibana-types
node scripts/type_check
```

What happens:

1. For every selected project, `target/types` is replaced with a symlink into
   `$MOUNT/<repoRel>/target/types`. Existing cached artifacts are moved into the
   mirror first so nothing is lost.
2. `tsgo -b` writes declarations and `.tsbuildinfo` files through the symlink
   into RAM. Downstream projects also read upstream `.d.ts` from RAM.
3. On `--cleanup`, the symlinks are removed but the mirror tree is preserved so
   subsequent runs keep their warm cache (until reboot or `--clean-cache`).

When this mode is active the archive code dereferences symlinks
(`tar --dereference`, `globby followSymbolicLinks: true`) so uploaded archives
contain the real `.d.ts` bytes.

### Mounting a RAM volume

**macOS (HFS+ RAM disk, ~4 GB):**

```sh
# Create a 4 GB RAM-backed HFS+ volume mounted at /Volumes/kibana-types.
# Note: hdiutil prints the device path padded with tabs — pipe through awk to
# strip whitespace, otherwise diskutil fails with "Unable to find disk".
# APFS isn't used here because eraseVolume APFS requires a pre-existing
# container, which a raw ram:// device doesn't have.
ramdisk_size_mb=4096
sectors=$(( ramdisk_size_mb * 2048 ))
device=$(hdiutil attach -nomount ram://${sectors} | awk '{print $1}')
diskutil eraseVolume HFS+ kibana-types "$device"
# → mounts at /Volumes/kibana-types
```

To tear it down (also reclaims the RAM): `hdiutil detach /Volumes/kibana-types`.

**Linux (tmpfs, suitable for CI):**

```sh
sudo mkdir -p /mnt/kibana-types
sudo mount -t tmpfs -o size=4G,uid=$(id -u),gid=$(id -g) tmpfs /mnt/kibana-types
```

In Buildkite, mount once in an environment hook and export
`KBN_TYPECHECK_RAMDISK=/mnt/kibana-types` so every typecheck step picks it up.

### When it helps (and when it doesn't)

| Scenario | Expected benefit |
|---|---|
| Cold full `-b` build, no archive restore | Largest win — emit + cross-project `.d.ts` reads hit RAM |
| CI cache-miss run | Same as cold full |
| Warm incremental dev loop with `--with-archive` | Negligible — tsc skips emit for unchanged projects |
| Single-project `--project ...` | Minimal — emit budget is small |

Ramdisk does not address parse time (172 s across the repo on a cold build),
config time (231 s), or any project-level CPU work — only the I/O slice of emit.

### Limitations

- macOS and Linux only. Windows junction semantics differ and are not handled.
- Requires ~2 GB of free RAM for the mirror tree plus headroom for tsc itself.
- The mount path must already exist and be writable when the CLI starts.
