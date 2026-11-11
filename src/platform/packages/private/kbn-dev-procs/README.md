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
| `↑` `↓` / `←` `→` | Select a process, or `all`                       |
| `tab`             | Switch the selected process between its logs, current settings, available settings and launch flags |
| `/`               | Filter the output; `enter` keeps it, `esc` clears |
| `PgUp` `PgDn`     | Scroll back through the output; `G` follows again |
| `r` `s` `x`       | Restart, start or stop the selected process      |
| `q` / `Ctrl+C`    | Stop every process, Kibana first, and quit       |

### Tools

The sidebar also lists dev tools that are not started with Elasticsearch and Kibana. Selecting one shows
its `--help` in its pane, so its flags are at hand (`/` filters them, PgUp/PgDn scroll). Press `s` to
start it: it asks for its arguments first, prefilled with the last ones used, and its output follows
the help.

| Tool                 | Runs                                   | Default arguments          |
| -------------------- | -------------------------------------- | -------------------------- |
| `synthtrace`         | `node scripts/synthtrace`, once Kibana is ready | `logs_and_metrics --live` |
| `connector-emulator` | `node scripts/connector_emulate`       | `--connector datadog`      |
| `data-forge`         | `node x-pack/scripts/data_forge`, once Elasticsearch is ready | `--dataset fake_logs` |

A running tool has its own log pane and can be restarted (`r`) or stopped (`x`) like the other
processes, and stops when you quit.

### Settings

`tab` shows the settings and launch flags of the selected process:

- **Current settings**: what it runs with. For Kibana, the settings from `config/kibana.yml`,
  `config/kibana.dev.yml` and the flags passed with `--kibana-arg`, each with its source; `--dev` adds
  development defaults on top. For Elasticsearch, the node settings (`elasticsearch.yml` and `-E` flags)
  and cluster settings, read from the running node.
- **Available settings**: everything it supports, with the ones you set marked ●. For Kibana, the
  settings and types from every plugin's config schema; listing them boots Kibana's plugins in a child
  process (`node scripts/dev kibana-settings`), which takes about 20s and is cached per commit in
  `data/dev`. For Elasticsearch, every setting the node knows, with its default.

- **Launch flags**: the options of the start script, such as `--eis`, `--ssl` or `--license`, read from
  `node scripts/kibana --help` and `node scripts/es snapshot --help`, with the ones the process runs with
  marked ●. `--dev` is left out, as `node scripts/dev` always passes it. kbn-es does not say which of its
  options take a value, so those show as `switch or value` unless they document a default.

`/` filters settings by name, value or type. Values of settings that look like credentials, such as
`elasticsearch.password`, are masked.

In a settings pane, `↑` `↓` move the cursor and `←` `→` switch process. On the selected setting:

| Key               | Action                                           |
| ----------------- | ------------------------------------------------ |
| `space`           | Toggle a boolean                                 |
| `e` / `enter`     | Edit the value; `enter` saves, `esc` cancels     |
| `u`               | Unset it                                         |

Kibana changes are written to `config/kibana.dev.yml`, keeping the rest of the file, and Kibana's dev
mode restarts its server by itself. Only that file is changed: a value from `kibana.yml` can be
overridden there but not unset, and `--kibana-arg` flags win over it. Elasticsearch changes are passed
as `-E` flags the next time it starts, for this run only; `↻` marks it until you restart it with `r`.
Launch flags work the same way for both: `space` switches one on or off, `e` gives it a value, and they
apply from the next restart, for this run only. Flags passed with `--es-arg` or `--kibana-arg` cannot be
changed in the TUI.

Without a terminal, or with `--headless`, the output of every process is printed with a `[es]` or
`[kibana]` prefix (`--hide-output` prints only state changes).

## Logs and status

Each process logs to `data/dev/<id>.log`, and `data/dev/status.json` holds the state of every
process (`waiting`, `starting`, `ready`, `stopping`, `stopped`, `exited`, `failed`).

`Supervisor` is the reusable part: give it `ProcessDefinition`s with `dependsOn` and a readiness check
(`http`, a `log` pattern, or `spawned`) and it starts each process once its dependencies are ready,
and can restart, stop or start any one of them.
