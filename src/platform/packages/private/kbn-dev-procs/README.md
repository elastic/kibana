# @kbn/dev-procs

Runs the processes of a local Kibana development environment together, behind `node scripts/dev`.

```sh
node scripts/dev                              # TUI: Elasticsearch, then Kibana once Elasticsearch is ready
node scripts/dev --es-arg=--license=trial     # pass arguments to `node scripts/es snapshot`
node scripts/dev --headless                   # no TUI: the combined output, prefixed by process
node scripts/dev status                       # state of each process, from another terminal or an agent
node scripts/dev status --wait-for kibana     # block until Kibana is ready; exits 1 if it fails or times out
```

## TUI

In a terminal, `node scripts/dev` shows a sidebar with each process and its state, and a pane with
the output of the selected process, or of all of them.

| Key               | Action                                           |
| ----------------- | ------------------------------------------------ |
| `↑` `↓` / `k` `j` | Select a process, or `all`                       |
| `/`               | Filter the output; `enter` keeps it, `esc` clears |
| `PgUp` `PgDn`     | Scroll back through the output; `G` follows again |
| `r` `s` `x`       | Restart, start or stop the selected process      |
| `q` / `Ctrl+C`    | Stop every process, Kibana first, and quit       |

Without a terminal, or with `--headless`, the output of every process is printed with a `[es]` or
`[kibana]` prefix (`--hide-output` prints only state changes).

## Logs and status

Each process logs to `data/dev/<id>.log`, and `data/dev/status.json` holds the state of every
process (`waiting`, `starting`, `ready`, `stopping`, `stopped`, `exited`, `failed`).

`Supervisor` is the reusable part: give it `ProcessDefinition`s with `dependsOn` and a readiness check
(`http`, a `log` pattern, or `spawned`) and it starts each process once its dependencies are ready,
and can restart, stop or start any one of them.
