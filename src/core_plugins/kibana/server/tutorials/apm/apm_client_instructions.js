/* eslint-disable max-len */

export const NODE_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre:
      'Install the APM agent for Node.js as a dependency to your application.',
    commands: ['npm install elastic-apm-node --save'],
  },
  {
    title: 'Configure the agent',
    textPre:
      'Agents are libraries that run inside of your application process.' +
      ' APM services are created programmatically based on the `serviceName`.' +
      ' This agent supports Express, Koa, hapi, and custom Node.js.',
    commands: `// Add this to the VERY top of the first file loaded in your app
var apm = require('elastic-apm-node').start({curlyOpen}
  // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
  serviceName: '',

  // Use if APM Server requires a token
  secretToken: '',

  // Set custom APM Server URL (default: http://localhost:8200)
  serverUrl: ''
{curlyClose})`.split('\n'),
    textPost: `See [the documentation]({config.docs.base_url}guide/en/apm/agent/nodejs/1.x/index.html) for advanced usage, including how to use with [Babel/ES Modules]({config.docs.base_url}guide/en/apm/agent/nodejs/1.x/advanced-setup.html#es-modules).`,
  },
];

export const DJANGO_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Install the APM agent for Python as a dependency.',
    commands: ['$ pip install elastic-apm'],
  },
  {
    title: 'Configure the agent',
    textPre:
      'Agents are libraries that run inside of your application process.' +
      ' APM services are created programmatically based on the `SERVICE_NAME`.',
    commands: `# Add the agent to the installed apps
INSTALLED_APPS = (
  'elasticapm.contrib.django',
  # ...
)

ELASTIC_APM = {curlyOpen}
  # Set required service name. Allowed characters:
  # a-z, A-Z, 0-9, -, _, and space
  'SERVICE_NAME': '',

  # Use if APM Server requires a token
  'SECRET_TOKEN': '',

  # Set custom APM Server URL (default: http://localhost:8200)
  'SERVER_URL': '',
{curlyClose}

# To send performance metrics, add our tracing middleware:
MIDDLEWARE = (
  'elasticapm.contrib.django.middleware.TracingMiddleware',
  #...
)`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/python/2.x/django-support.html) for advanced usage.',
  },
];

export const FLASK_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Install the APM agent for Python as a dependency.',
    commands: ['$ pip install elastic-apm[flask]'],
  },
  {
    title: 'Configure the agent',
    textPre:
      'Agents are libraries that run inside of your application process.' +
      ' APM services are created programmatically based on the `SERVICE_NAME`.',
    commands: `# initialize using environment variables
from elasticapm.contrib.flask import ElasticAPM
app = Flask(__name__)
apm = ElasticAPM(app)

# or configure to use ELASTIC_APM in your application's settings
from elasticapm.contrib.flask import ElasticAPM
app.config['ELASTIC_APM'] = {curlyOpen}
  # Set required service name. Allowed characters:
  # a-z, A-Z, 0-9, -, _, and space
  'SERVICE_NAME': '',

  # Use if APM Server requires a token
  'SECRET_TOKEN': '',

  # Set custom APM Server URL (default: http://localhost:8200)
  'SERVER_URL': '',
{curlyClose}

apm = ElasticAPM(app)`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/python/2.x/flask-support.html) for advanced usage.',
  },
];

export const RAILS_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Add the agent to your Gemfile.',
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: 'Configure the agent',
    textPre:
      'APM is automatically started when your app boots. Configure the agent, by creating the config file `config/elastic_apm.yml`',
    commands: `# config/elastic_apm.yml:

# Set service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
# Defaults to the name of your Rails app
service_name: ''

# Use if APM Server requires a token
secret_token: ''

# Set custom APM Server URL (default: http://localhost:8200)
server_url: ''`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html) for configuration options and advanced usage.\n\n' +
      '**Warning: The Ruby agent is currently in Beta and not meant for production use.**',
  },
];

export const RACK_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Add the agent to your Gemfile.',
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: 'Configure the agent',
    textPre:
      'Rack or compatible framework (like Sinatra). Include the middleware in your app and start the agent.',
    commands: `# config.ru
  require 'sinatra/base'

  class MySinatraApp < Sinatra::Base
    use ElasticAPM::Middleware

    # ...
  end

  ElasticAPM.start(
    app: MySinatraApp, # required
    config_file: '' # optional, defaults to config/elastic_apm.yml
  )

  run MySinatraApp

  at_exit {curlyOpen} ElasticAPM.stop {curlyClose}`.split('\n'),
  },
  {
    title: 'Create config file',
    textPre: 'Create a config file `config/elastic_apm.yml`:',
    commands: `# config/elastic_apm.yml:

# Set service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
# Defaults to the name of your Rails app
service_name: ''

# Use if APM Server requires a token
secret_token: ''

# Set custom APM Server URL (default: http://localhost:8200)
server_url: ''`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html) for configuration options and advanced usage.\n\n' +
      '**Warning: The Rack agent is currently in Beta and not meant for production use.**',
  },
];

export const JS_CLIENT_INSTRUCTIONS = [
  {
    title: 'Enable experimental frontend support in the APM server',
    textPre:
      'Please refer to [the documentation]({config.docs.base_url}guide/en/apm/server/{config.docs.version}/frontend.html).',
  },
  {
    title: 'Install the APM agent',
    textPre:
      'Install the APM agent for JavaScript as a dependency to your application:',
    commands: [`npm install elastic-apm-js-base --save`],
  },
  {
    title: 'Configure the agent',
    textPre: 'Agents are libraries that run inside of your application.',
    commands: `import {curlyOpen} init as initApm {curlyClose} from 'elastic-apm-js-base'
var apm = initApm({curlyOpen}

  // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
  serviceName: '',

  // Set custom APM Server URL (default: http://localhost:8200)
  serverUrl: '',

  // Set service version (required for sourcemap feature)
  serviceVersion: ''
{curlyClose})`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/js-base/0.x/index.html)  for advanced usage.\n\n' +
      '**Warning: The JS agent is currently in Beta and not meant for production use.**',
  },
];
