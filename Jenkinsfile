#!/bin/groovy

def bash(script) {
  sh(
    script: "#!/bin/bash\n${script}"
  )
}

def testWithLabel = { label ->
    return {
        node(label) {
            bash("""
                export HOME=/var/lib/jenkins
                export CI=true
                export TEST_BROWSER_HEADLESS=1
                export GCS_UPLOAD_PREFIX=test
                git clone https://github.com/elastic/kibana.git
                cd kibana
                source src/dev/ci_setup/extract_bootstrap_cache.sh
                source src/dev/ci_setup/setup.sh
                cd x-pack
                export JAVA_HOME=/var/lib/jenkins/.java/openjdk14
                node scripts/functional_tests \
                    --debug --bail \
                    --config test/security_solution_cypress/cli_config.ts
            """)
        }
    }
}

parallel([
    'centos-7': testWithLabel('centos-7 && immutable && gobld/image:family/elastic-kibana-ci-centos-7-nocache'),
    'debian-9': testWithLabel('debian-9 && immutable && gobld/image:family/elastic-kibana-ci-debian-9-nocache'),
    'debian-10': testWithLabel('debian-10 && immutable && gobld/image:family/elastic-kibana-ci-debian-10-nocache'),
    'ubuntu-16.04': testWithLabel('ubuntu-16.04 && immutable && gobld/image:family/elastic-kibana-ci-ubuntu-1604-lts-nocache'),
    'ubuntu-18.04': testWithLabel('ubuntu-18.04 && immutable && gobld/image:family/elastic-kibana-ci-ubuntu-1804-lts-nocache'),
])
