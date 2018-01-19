export const LOGSTASH_INSTRUCTIONS = {
  INSTALL: {
    OSX: [
      {
        title: 'Download and install the Java Runtime Environment',
        textPre: 'Follow the installation instructions [here](https://docs.oracle.com/javase/8/docs/technotes/guides/install/mac_jre.html).'
      },
      {
        title: 'Download and install Logstash',
        textPre: 'First time using Logstash?  See the ' +
          '[Getting Started Guide]({config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html).',
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz',
          'tar xzvf logstash-{config.kibana.version}.tar.gz'
        ]
      }
    ],
    WINDOWS: [
      {
        title: 'Download and install the Java Runtime Environment',
        textPre: 'Follow the installation instructions [here](https://docs.oracle.com/javase/8/docs/technotes/guides/install/windows_jre_install.html).'
      },
      {
        title: 'Download and install Logstash',
        textPre: 'First time using Logstash?  See the ' +
          '[Getting Started Guide]({config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html).\n' +
          '  1. [Download](https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.zip) the Logstash Windows zip file.\n' +
          '  2. Extract the contents of the zip file.'
      }
    ],
  }
};
