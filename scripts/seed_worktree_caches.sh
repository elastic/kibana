#!/usr/bin/env bash
#
# Seed a freshly-created git worktree with build caches copied from the main
# worktree so it doesn't start "cold". Kibana keeps every build cache inside the
# worktree (and gitignored), so a brand-new `git worktree add` has none of them:
#
#   - node_modules                                  (biggest bootstrap cost)
#   - data/jest-cache, data/babel_register_cache    (test + transpile caches)
#   - <pkg>/target/public/.kbn-optimizer-cache      (webpack/optimizer bundles)
#   - <pkg>/target/types/*.tsbuildinfo              (TypeScript incremental cache)
#
# We clone these from the main worktree using copy-on-write where the filesystem
# supports it (APFS clonefile on macOS, reflinks on Btrfs/XFS on Linux) so it
# consumes almost no extra disk. The optimizer/TS caches are content-hash keyed,
# so a clone stays valid on the same commit; anything that differs is simply
# rebuilt incrementally instead of from scratch.
#
# Invoked automatically by the `post-checkout` git hook installed via
#   node scripts/register_git_hook
# The hook runs this detached in the background so it never blocks
# `git worktree add`; it can also be run manually from inside a new worktree:
#   bash scripts/seed_worktree_caches.sh
#
# Set KBN_SKIP_WORKTREE_SEED=1 to disable. This script is best-effort and always
# exits 0 so it can never fail the git command that triggered it.

set -uo pipefail

# --- opt-out ---------------------------------------------------------------
if [ "${KBN_SKIP_WORKTREE_SEED:-}" = "1" ]; then
  exit 0
fi

# --- git post-checkout gate ------------------------------------------------
# post-checkout hook args: <prev_head> <new_head> <is_branch_checkout>
# A brand-new worktree (or clone) has an all-zeros prev_head. When run manually
# (no args) we always proceed.
PREV_HEAD="${1:-}"
BRANCH_FLAG="${3:-1}"
if [ -n "$PREV_HEAD" ]; then
  case "$PREV_HEAD" in
    *[!0]*) exit 0 ;; # prev_head has a non-zero char -> ordinary checkout, skip
  esac
  [ "$BRANCH_FLAG" = "1" ] || exit 0
fi

# --- locate source (main) and destination (this) worktrees -----------------
DST_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -n "$DST_ROOT" ] || exit 0

# The main working tree is always the first entry of `git worktree list`.
SRC_ROOT="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print substr($0, 10); exit}')"
[ -n "$SRC_ROOT" ] || exit 0

# Nothing to seed if we ARE the main worktree, or it was never bootstrapped.
[ "$SRC_ROOT" != "$DST_ROOT" ] || exit 0
if [ ! -d "$SRC_ROOT/node_modules" ]; then
  echo "[seed-worktree] main worktree ($SRC_ROOT) has no node_modules yet; skipping."
  exit 0
fi

# Copy-on-write clones (APFS clonefile / Btrfs-XFS reflinks) only work within a
# single filesystem. If the worktree lives on a different volume than the main
# worktree, a "clone" would silently degrade to a full byte-for-byte copy of
# 17G+ of node_modules — slower than a normal bootstrap and unacceptable inside
# a git hook. Detect that up front (compare device numbers) and bail cleanly.
dev_of() { stat -f '%d' "$1" 2>/dev/null || stat -c '%d' "$1" 2>/dev/null; }
SRC_DEV="$(dev_of "$SRC_ROOT")"
DST_DEV="$(dev_of "$DST_ROOT")"
if [ -z "$SRC_DEV" ] || [ "$SRC_DEV" != "$DST_DEV" ]; then
  echo "[seed-worktree] worktree is on a different filesystem than $SRC_ROOT;"
  echo "[seed-worktree] copy-on-write is unavailable, so skipping cache seed."
  echo "[seed-worktree] set it up the normal way with:  yarn kbn bootstrap"
  exit 0
fi

echo "[seed-worktree] seeding build caches into $DST_ROOT"
echo "[seed-worktree]   from $SRC_ROOT"

# --- build the list of paths to clone --------------------------------------
# Emitted as "src<TAB>dst" lines: node_modules, data/, and every per-package
# target/ dir (optimizer cache + *.tsbuildinfo). We prune node_modules from the
# find and never descend into a target/ once matched, so each entry is a whole
# directory tree cloned in one shot.
emit_pairs() {
  local rel
  for rel in node_modules data; do
    [ -e "$SRC_ROOT/$rel" ] && [ ! -e "$DST_ROOT/$rel" ] &&
      printf '%s\t%s\n' "$SRC_ROOT/$rel" "$DST_ROOT/$rel"
  done
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    [ -e "$DST_ROOT/$rel" ] && continue # never clobber something already present
    printf '%s\t%s\n' "$SRC_ROOT/$rel" "$DST_ROOT/$rel"
  done < <(
    cd "$SRC_ROOT" 2>/dev/null &&
      find . -type d -name node_modules -prune -o -type d -name target -prune -print 2>/dev/null |
      sed 's|^\./||'
  )
}

# --- clone every pair with the fastest copy-on-write method available -------
# macOS: a single clonefile(2) per directory clones the whole tree in one kernel
# call (near-instant regardless of file count) — driven via python3, which ships
# with the Xcode Command Line Tools that also provide git. Linux: per-directory
# reflink via GNU cp. Everything degrades gracefully to a plain recursive copy.
PAIRS="$(emit_pairs)"
[ -n "$PAIRS" ] || { echo "[seed-worktree] nothing to seed."; exit 0; }

# Each tree is cloned to a temp sibling and then atomically renamed into place,
# so a given cache dir is only ever absent or complete — never half-written.
# This keeps the seed safe to run in the background (the post-checkout hook does)
# even if `yarn kbn bootstrap` starts concurrently.
cloned_via_clonefile=0
if [ "$(uname)" = "Darwin" ] && command -v python3 >/dev/null 2>&1; then
  if printf '%s\n' "$PAIRS" | python3 -c '
import ctypes, os, shutil, sys
libc = ctypes.CDLL("/usr/lib/libSystem.dylib", use_errno=True)
clonefile = libc.clonefile
clonefile.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_uint32]
ok = fail = 0
for line in sys.stdin:
    line = line.rstrip("\n")
    if not line or "\t" not in line:
        continue
    src, dst = line.split("\t", 1)
    if os.path.lexists(dst):
        continue
    try:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
    except OSError:
        pass
    tmp = "%s.seeding.%d" % (dst, os.getpid())
    shutil.rmtree(tmp, ignore_errors=True)
    # clonefile(2) requires the destination path not to exist.
    if clonefile(src.encode(), tmp.encode(), 0) != 0:
        shutil.rmtree(tmp, ignore_errors=True)
        fail += 1
        continue
    try:
        if os.path.lexists(dst):  # someone (bootstrap) created it meanwhile
            shutil.rmtree(tmp, ignore_errors=True)
        else:
            os.rename(tmp, dst)  # atomic publish within the same filesystem
            ok += 1
    except OSError:
        shutil.rmtree(tmp, ignore_errors=True)
        fail += 1
print(f"[seed-worktree] cloned {ok} tree(s) via clonefile, {fail} skipped", file=sys.stderr)
sys.exit(0 if ok else 1)
'; then
    cloned_via_clonefile=1
  fi
fi

if [ "$cloned_via_clonefile" != "1" ]; then
  # Portable fallback: reflink where supported, otherwise a plain recursive copy.
  # Same temp-then-rename dance to keep publishes atomic.
  echo "[seed-worktree] clonefile unavailable; falling back to cp (this may be slow)"
  while IFS="$(printf '\t')" read -r src dst; do
    [ -n "${src:-}" ] && [ -n "${dst:-}" ] || continue
    [ -e "$dst" ] && continue
    mkdir -p "$(dirname "$dst")" 2>/dev/null || continue
    tmp="$dst.seeding.$$"
    rm -rf "$tmp" 2>/dev/null
    if cp -a --reflink=auto "$src" "$tmp" 2>/dev/null || # GNU coreutils CoW (Linux)
      cp -Rc "$src" "$tmp" 2>/dev/null ||                # BSD/macOS per-file clone
      cp -R "$src" "$tmp" 2>/dev/null; then              # plain copy
      if [ -e "$dst" ]; then rm -rf "$tmp" 2>/dev/null; else mv "$tmp" "$dst" 2>/dev/null || rm -rf "$tmp" 2>/dev/null; fi
    else
      rm -rf "$tmp" 2>/dev/null
    fi
  done <<EOF
$PAIRS
EOF
fi

echo "[seed-worktree] done. Finish with:  yarn kbn bootstrap"
echo "[seed-worktree]   (re-links workspace packages & bins for the new path)"

exit 0
