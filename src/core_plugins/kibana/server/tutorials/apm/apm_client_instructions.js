/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
# service_name: 'my-service'

# Use if APM Server requires a token
# secret_token: ''

# Set custom APM Server URL (default: http://localhost:8200)
# server_url: 'http://localhost:8200'`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html) for configuration options and advanced usage.\n\n',
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
      'For Rack or a compatible framework (e.g. Sinatra), include the middleware in your app and start the agent.',
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
# Defaults to the name of your Rack app's class.
# service_name: 'my-service'

# Use if APM Server requires a token
# secret_token: ''

# Set custom APM Server URL (default: http://localhost:8200)
# server_url: 'http://localhost:8200'`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html) for configuration options and advanced usage.\n\n',
  },
];

export const JS_CLIENT_INSTRUCTIONS = [
  {
    title: 'Enable Real User Monitoring support in the APM server',
    textPre:
      'Please refer to [the documentation]({config.docs.base_url}guide/en/apm/server/{config.docs.version}/rum.html).',
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
      '({config.docs.base_url}guide/en/apm/agent/js-base/current/index.html) for advanced usage.',
  },
];

export const GO_CLIENT_INSTRUCTIONS = [
  {
    title: 'Install the APM agent',
    textPre: 'Install the APM agent packages for Go.',
    commands: ['go get github.com/elastic/apm-agent-go'],
  },
  {
    title: 'Configure the agent',
    textPre:
      'Agents are libraries that run inside of your application process.' +
      ' APM services are created programmatically based on the executable ' +
      ' file name, or the `ELASTIC_APM_SERVICE_NAME` environment variable.',
    commands: `# Initialize using environment variables:

# Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.
# If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.
export ELASTIC_APM_SERVICE_NAME=

# Set the APM Server URL. If unspecified, the agent will effectively be disabled.
export ELASTIC_APM_SERVER_URL=

# Set if APM Server requires a token.
export ELASTIC_APM_SECRET_TOKEN=
`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/go/current/configuration.html) for advanced configuration.',
  },
  {
    title: 'Instrument your application',
    textPre:
      'Instrument your Go application by using one of the provided instrumentation modules or ' +
      'by using the tracer API directly.',
    commands: `
import (
	"net/http"

	"github.com/elastic/apm-agent-go/module/apmhttp"
)

func main() {curlyOpen}
	mux := http.NewServeMux()
	...
	http.ListenAndServe(":8080", apmhttp.Wrap(mux))
{curlyClose}
`.split('\n'),
    textPost:
      'See the [documentation]' +
      '({config.docs.base_url}guide/en/apm/agent/go/current/instrumenting-source.html) for a detailed ' +
      'guide to instrumenting Go source code.\n\n' +
      '**Warning: The Go agent is currently in Beta and not meant for production use.**',
  },
];

export const JAVA_CLIENT_INSTRUCTIONS = [
  {
    title: 'Download the APM agent',
    textPre: 'Download the agent jar from [Maven Central](http://search.maven.org/#search%7Cga%7C1%7Ca%3Aelastic-apm-agent). ' +
    'Do **not** add the agent as a dependency to your application.'
  },
  {
    title: 'Start your application with the javaagent flag',
    textPre: 'Add the `-javaagent` flag and configure the agent with system properties.\n' +
    '\n' +
    ' * Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)\n' +
    ' * Set custom APM Server URL (default: http://localhost:8200)\n' +
    ' * Set the base package of your application',
    commands: `java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\
     -Delastic.apm.service_name=my-application \\
     -Delastic.apm.server_url=http://localhost:8200 \\ 
     -Delastic.apm.application_packages=org.example \\ 
     -jar my-application.jar`.split('\n'),
    textPost:
    'See the [documentation]' +
    '({config.docs.base_url}guide/en/apm/agent/java/current/index.html) for configuration options and advanced usage.\n\n' +
    '**Warning: The Java agent is currently in Beta and not meant for production use.**',
  },
];
