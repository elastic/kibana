export const NODE_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Install the APM agent for Node.js as a dependency to your application.',
    commands: [
      'npm install elastic-apm-node --save'
    ]
  },
  {
    title: 'Configure the agent',
    textPre: 'Agents are libraries that run inside of your application process.' +
      ' APM services are created programmatically based on the `serviceName`.' +
      ' This agent supports Express, Koa, hapi, and custom Node.js.',
    commands: [
      `// Add this to the VERY top of the first file loaded in your app`,
      `var apm = require('elastic-apm-node').start({curlyOpen}`,
      `  // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)`,
      `  serviceName: '',`,
      `  `,
      `  // Use if APM Server requires a token`,
      `  secretToken: '',`,
      `  `,
      `  // Set custom APM Server URL (default: http://localhost:8200)`,
      `  serverUrl: ''`,
      `{curlyClose})`,
    ],
    textPost: 'See [the documentation]({config.docs.base_url}guide/en/apm/agent/nodejs/1.x/index.html)' +
    ' for advanced usage. Babel users, refer to [the documentation]' +
    '({config.docs.base_url}guide/en/apm/agent/nodejs/1.x/advanced-setup.html#es-modules).'
  }
];

export const DJANGO_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Install the APM agent for Python as a dependency.',
    commands: [
      '$ pip install elastic-apm'
    ]
  },
  {
    title: 'Configure the agent',
    textPre: 'Agents are libraries that run inside of your application process.' +
      ' APM services are created programmatically based on the `SERVICE_NAME`.',
    commands: [
      `# Add the agent to the installed apps`,
      `INSTALLED_APPS = (`,
      `  'elasticapm.contrib.django',`,
      `  # ...`,
      `)`,
      ` `,
      `# Choose a service name and optionally a secret token`,
      `ELASTIC_APM = {curlyOpen}`,
      `  'SERVICE_NAME': '<SERVICE-NAME>',`,
      `  'SECRET_TOKEN': '<SECRET-TOKEN>',`,
      `{curlyClose}`,
      ` `,
      `# To send performance metrics, add our tracing middleware:`,
      `MIDDLEWARE = (`,
      `  'elasticapm.contrib.django.middleware.TracingMiddleware',`,
      `  #...`,
      `)`
    ],
    textPost: 'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/python/2.x/django-support.html) for advanced usage.'
  }
];

export const FLASK_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Install the APM agent for Python as a dependency.',
    commands: [
      '$ pip install elastic-apm[flask]'
    ]
  },
  {
    title: 'Configure the agent',
    textPre: 'Agents are libraries that run inside of your application process.' +
      ' APM services are created programmatically based on the `SERVICE_NAME`.',
    commands: [
      `# initialize using environment variables`,
      `from elasticapm.contrib.flask import ElasticAPM`,
      `app = Flask(__name__)`,
      `apm = ElasticAPM(app)`,
      ` `,
      `# or configure to use ELASTIC_APM in your application's settings`,
      `from elasticapm.contrib.flask import ElasticAPM`,
      `app.config['ELASTIC_APM'] = {curlyOpen}`,
      `    # allowed characters in SERVICE_NAME: a-z, A-Z, 0-9, -, _, and space`,
      `    'SERVICE_NAME': '<SERVICE-NAME>',`,
      `    'SECRET_TOKEN': '<SECRET-TOKEN>',`,
      `{curlyClose}`,
      ` `,
      `apm = ElasticAPM(app)`,
    ],
    textPost: 'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/python/2.x/flask-support.html) for advanced usage.'
  }
];

export const RAILS_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Add the agent to your Gemfile.',
    commands: [
      `gem 'elastic-apm'`
    ]
  },
  {
    title: 'Configure the agent',
    textPre: 'Configure the agent by creating the config file `config/elastic_apm.yml`.',
    commands: [
      `# config/elastic_apm.yml`,
      `server_url: 'http://localhost:8200'`,
    ],
    textPost: 'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html) for configuration options and advanced usage.\n\n' +
      '**Warning: The Ruby agent is currently in Beta and not meant for production use.**'
  }
];

export const RACK_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Add the agent to your Gemfile.',
    commands: [
      `gem 'elastic-apm'`
    ]
  },
  {
    title: 'Configure the agent',
    textPre: 'For a Rack or compatible framework such as Sinatra, include the middleware in your app and start the agent.',
    commands: [
      `# config.ru`,
      `require 'sinatra/base'`,
      `class MySinatraApp < Sinatra::Base`,
      `  use ElasticAPM::Middleware`,
      ` `,
      `  # ...`,
      `end`,
      `# Takes optional ElasticAPM::Config values`,
      `ElasticAPM.start(`,
      `  app: MySinatraApp, # required`,
      `  server_url: 'http://localhost:8200'`,
      `)`,
      `run MySinatraApp`,
      `at_exit {curlyOpen} ElasticAPM.stop {curlyClose}`,
    ],
    textPost: 'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html) for configuration options and advanced usage.\n\n' +
      '**Warning: The Rack agent is currently in Beta and not meant for production use.**'
  }
];

export const JS_CLIENT_INSTRUCTIONS = [
  {
    title: 'Enable experimental frontend support in the APM server',
    textPre: 'Please refer to [the documentation]({config.docs.base_url}guide/en/apm/server/{config.docs.version}/frontend.html).'
  },
  {
    title: 'Install the APM agent',
    textPre: 'Install the APM agent for JavaScript as a dependency to your application:',
    commands: [
      `npm install elastic-apm-js-base --save`
    ]
  },
  {
    title: 'Configure the agent',
    textPre: 'Agents are libraries that run inside of your application.',
    commands: [
      `import {curlyOpen} init as initApm {curlyClose} from 'elastic-apm-js-base'`,
      `var apm = initApm({curlyOpen}`,
      ` `,
      `  // Set custom APM Server URL (default: http://localhost:8200)`,
      `  serverUrl: 'http://localhost:8200',`,
      ` `,
      `  // Set required service name`,
      `  serviceName: 'service-name',`,
      ` `,
      `  // Set service version (required for sourcemap feature)`,
      `  serviceVersion: 'service-version'`,
      `{curlyClose})`,
    ],
    textPost: 'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/js-base/0.x/index.html)  for advanced usage.\n\n' +
      '**Warning: The JS agent is currently in Alpha and not meant for production use.**'
  }
];
