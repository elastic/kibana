package builds

import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script

object OssBuild : BuildType({
    name = "Build"
    paused = true
    description = "Generates OSS Build Distribution artifact"

    artifactRules = "+:build/oss/kibana-*-SNAPSHOT-linux-x86_64/**/* => kibana-oss.tar.gz"

    steps {
        script {
            scriptContent = """
                #!/bin/bash
                if [[ -d "/home/agent/.kibana/node_modules" ]]; then
                  echo 'Using node_modules cache'
                  mv /home/agent/.kibana/node_modules .
                fi

                export CI=true
                source ./src/dev/ci_setup/setup.sh

                node scripts/build_kibana_platform_plugins \
                  --oss \
                  --filter '!alertingExample' \
                  --scan-dir "${'$'}KIBANA_DIR/test/plugin_functional/plugins" \
                  --scan-dir "${'$'}KIBANA_DIR/test/interpreter_functional/plugins" \
                  --verbose

                export KBN_NP_PLUGINS_BUILT=true
                node scripts/build --debug --oss
            """.trimIndent()
        }
    }
})
