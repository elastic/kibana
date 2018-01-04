export const LOGSTASH_INSTRUCTIONS = {
  INSTALL: {
    OSX: [
      {
        title: 'Download and install the Java runtime environment',
        textPre: 'Follow the installation instructions [here](https://docs.oracle.com/javase/8/docs/technotes/guides/install/mac_jre.html).'
      },
      {
        title: 'Download and install Logstash',
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz',
          'tar xzvf logstash-{config.kibana.version}.tar.gz'
        ]
      }
    ]
  }
};
