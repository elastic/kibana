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
| `tab`             | Switch the selected process between its logs, current settings and available settings |
| `/`               | Filter the output; `enter` keeps it, `esc` clears |
| `PgUp` `PgDn`     | Scroll back through the output; `G` follows again |
| `r` `s` `x`       | Restart, start or stop the selected process      |
| `q` / `Ctrl+C`    | Stop every process, Kibana first, and quit       |

### Settings

`tab` shows the settings of the selected process:

- **Current settings**: what it runs with. For Kibana, the settings from `config/kibana.yml`,
  `config/kibana.dev.yml` and the flags passed with `--kibana-arg`, each with its source; `--dev` adds
  development defaults on top. For Elasticsearch, the node settings (`elasticsearch.yml` and `-E` flags)
  and cluster settings, read from the running node.
- **Available settings**: everything it supports, with the ones you set marked ●. For Kibana, the
  settings and types from every plugin's config schema; listing them boots Kibana's plugins in a child
  process (`node scripts/dev kibana-settings`), which takes about 20s and is cached per commit in
  `data/dev`. For Elasticsearch, every setting the node knows, with its default.

`/` filters settings by name, value or type. Values of settings that look like credentials, such as
`elasticsearch.password`, are masked.

Without a terminal, or with `--headless`, the output of every process is printed with a `[es]` or
`[kibana]` prefix (`--hide-output` prints only state changes).

## Logs and status

Each process logs to `data/dev/<id>.log`, and `data/dev/status.json` holds the state of every
process (`waiting`, `starting`, `ready`, `stopping`, `stopped`, `exited`, `failed`).

`Supervisor` is the reusable part: give it `ProcessDefinition`s with `dependsOn` and a readiness check
(`http`, a `log` pattern, or `spawned`) and it starts each process once its dependencies are ready,
and can restart, stop or start any one of them.
