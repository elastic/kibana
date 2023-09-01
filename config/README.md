as work on serverless picks up we will add config values to these files that
define how Kibana will run in "serverless" modes. To start Kibana locally with
this configuration, pass `--serverless={mode}` or run `yarn serverless-{mode}`

valid modes are currently: `es`, `oblt`, and `security`

configuration is applied in the following order, later values override
 1. serverless.yml (serverless configs go first)
 2. serverless.{mode}.yml (serverless configs go first)
 3. base config, in this preference order:
  - my-config.yml(s) (set by --config)
  - env-config.yml (described by `env.KBN_CONFIG_PATHS`)
  - kibana.yml (default @ `env.KBN_PATH_CONF`/kibana.yml)
 4. kibana.dev.yml
 5. serverless.dev.yml
 6. serverless.{mode}.dev.yml
