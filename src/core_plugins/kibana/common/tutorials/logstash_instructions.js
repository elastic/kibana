const SKIP_INSTALL_SENTENCE = '_Skip this step if Logstash is already installed._';
const FIRST_TIME_SENTENCE = '_First time using Logstash? See the [Getting Started Guide]({config.docs.logstash}/'
  + 'getting-started-with-logstash.html)._';

export const LOGSTASH_INSTRUCTIONS = {
  INSTALL: {
    OSX: [
      {
        title: 'Download and install the Java runtime environment',
        textPre: `Follow the installation instructions [here](https://docs.oracle.com/javase/8/docs/technotes/guides/install/mac_jre.html). ` +
          `${SKIP_INSTALL_SENTENCE} ${FIRST_TIME_SENTENCE}`,
        commands: []
      },
      {
        title: 'Download and install Logstash',
        textPre: SKIP_INSTALL_SENTENCE,
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz',
          'tar xzvf logstash-{config.kibana.version}.tar.gz'
        ]
      }
    ],
    DEB: [
      {
        title: 'Download and install the Java runtime environment',
        textPre: `${SKIP_INSTALL_SENTENCE} ${FIRST_TIME_SENTENCE}`,
        commands: [
          'sudo apt-get install default-jre'
        ]
      },
      {
        title: 'Download and install Logstash',
        textPre: SKIP_INSTALL_SENTENCE,
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.deb',
          'sudo apt install ./logstash-{config.kibana.version}.deb'
        ]
      }
    ]
  }
};
