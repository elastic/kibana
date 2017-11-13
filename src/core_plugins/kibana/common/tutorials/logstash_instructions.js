export const LOGSTASH_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Logstash',
      textPre: 'Skip this step if Logstash is already installed. First time using Logstash? See the ' +
               '[Getting Started Guide]({config.docs.logstash}/getting-started-with-logstash.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz',
        'tar xzvf logstash-{config.kibana.version}.tar.gz'
      ]
    }
  }
};
