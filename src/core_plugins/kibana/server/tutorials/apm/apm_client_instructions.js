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

import { i18n }  from '@kbn/i18n';

export const NODE_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.nodeClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.nodeClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Node.js as a dependency to your application.',
    }),
    commands: ['npm install elastic-apm-node --save'],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.textPre', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `serviceName`. \
This agent supports Express, Koa, hapi, and custom Node.js.',
    }),
    commands: `// ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.addThisToTheFileTopComment', {
      defaultMessage: 'Add this to the VERY top of the first file loaded in your app',
    })}
var apm = require('elastic-apm-node').start({curlyOpen}
  // ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.setRequiredServiceNameComment', {
    defaultMessage: 'Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)',
  })}
  serviceName: '',

  // ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.useIfApmRequiresTokenComment', {
    defaultMessage: 'Use if APM Server requires a token',
  })}
  secretToken: '',

  // ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  serverUrl: ''
{curlyClose})`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.textPost', {
      defaultMessage: 'See [the documentation]({documentationLink}) for advanced usage, including how to use with [Babel/ES Modules]({babelEsModulesLink}).',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/nodejs/1.x/index.html',
        babelEsModulesLink: '{config.docs.base_url}guide/en/apm/agent/nodejs/1.x/advanced-setup.html#es-modules',
      },
    }),
  },
];

export const DJANGO_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.djangoClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.djangoClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Python as a dependency.',
    }),
    commands: ['$ pip install elastic-apm'],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.textPre', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `SERVICE_NAME`.',
    }),
    commands: `# ${i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.commands.addAgentComment', {
      defaultMessage: 'Add the agent to the installed apps',
    })}
INSTALLED_APPS = (
  'elasticapm.contrib.django',
  # ...
)

ELASTIC_APM = {curlyOpen}
  # ${i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.commands.setRequiredServiceNameComment', {
    defaultMessage: 'Set required service name. Allowed characters:',
  })}
  # ${i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.commands.allowedCharactersComment', {
    defaultMessage: 'a-z, A-Z, 0-9, -, _, and space',
  })}
  'SERVICE_NAME': '',

  # ${i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.commands.useIfApmServerRequiresTokenComment', {
    defaultMessage: 'Use if APM Server requires a token',
  })}
  'SECRET_TOKEN': '',

  # ${i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  'SERVER_URL': '',
{curlyClose}

# ${i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.commands.addTracingMiddlewareComment', {
    defaultMessage: 'To send performance metrics, add our tracing middleware:',
  })}
MIDDLEWARE = (
  'elasticapm.contrib.django.middleware.TracingMiddleware',
  #...
)`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/python/2.x/django-support.html' },
    }),
  },
];

export const FLASK_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.flaskClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.flaskClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Python as a dependency.',
    }),
    commands: ['$ pip install elastic-apm[flask]'],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.textPre', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `SERVICE_NAME`.',
    }),
    commands: `# ${i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.commands.initializeUsingEnvironmentVariablesComment', {
      defaultMessage: 'initialize using environment variables',
    })}
from elasticapm.contrib.flask import ElasticAPM
app = Flask(__name__)
apm = ElasticAPM(app)

# ${i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.commands.configureElasticApmComment', {
    defaultMessage: 'or configure to use ELASTIC_APM in your application\'s settings',
  })}
from elasticapm.contrib.flask import ElasticAPM
app.config['ELASTIC_APM'] = {curlyOpen}
  # ${i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.commands.setRequiredServiceNameComment', {
    defaultMessage: 'Set required service name. Allowed characters:',
  })}
  # ${i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.commands.allowedCharactersComment', {
    defaultMessage: 'a-z, A-Z, 0-9, -, _, and space',
  })}
  'SERVICE_NAME': '',

  # ${i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.commands.useIfApmServerRequiresTokenComment', {
    defaultMessage: 'Use if APM Server requires a token',
  })}
  'SECRET_TOKEN': '',

  # ${i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  'SERVER_URL': '',
{curlyClose}

apm = ElasticAPM(app)`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/python/2.x/flask-support.html' },
    }),
  },
];

export const RAILS_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.railsClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.railsClient.install.textPre', {
      defaultMessage: 'Add the agent to your Gemfile.',
    }),
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.railsClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.railsClient.configure.textPre', {
      defaultMessage: 'APM is automatically started when your app boots. Configure the agent, by creating the config file {configFile}',
      values: { configFile: '`config/elastic_apm.yml`' },
    }),
    commands: `# config/elastic_apm.yml:

# Set service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
# Defaults to the name of your Rails app
# service_name: 'my-service'

# Use if APM Server requires a token
# secret_token: ''

# Set custom APM Server URL (default: http://localhost:8200)
# server_url: 'http://localhost:8200'`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.railsClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html' },
    }),
  },
];

export const RACK_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.rackClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.rackClient.install.textPre', {
      defaultMessage: 'Add the agent to your Gemfile.',
    }),
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.rackClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.rackClient.configure.textPre', {
      defaultMessage: 'For Rack or a compatible framework (e.g. Sinatra), include the middleware in your app and start the agent.',
    }),
    commands: `# config.ru
  require 'sinatra/base'

  class MySinatraApp < Sinatra::Base
    use ElasticAPM::Middleware

    # ...
  end

  ElasticAPM.start(
    app: MySinatraApp, # ${i18n.translate('kbn.server.tutorials.apm.rackClient.configure.commands.requiredComment', {
    defaultMessage: 'required',
  })}
    config_file: '' # ${i18n.translate('kbn.server.tutorials.apm.rackClient.configure.commands.optionalComment', {
    defaultMessage: 'optional, defaults to config/elastic_apm.yml',
  })}
  )

  run MySinatraApp

  at_exit {curlyOpen} ElasticAPM.stop {curlyClose}`.split('\n'),
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.title', {
      defaultMessage: 'Create config file',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.textPre', {
      defaultMessage: 'Create a config file {configFile}:',
      values: { configFile: '`config/elastic_apm.yml`' },
    }),
    commands: `# config/elastic_apm.yml:

# ${i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.commands.setServiceNameComment', {
    defaultMessage: 'Set service name - allowed characters: a-z, A-Z, 0-9, -, _ and space',
  })}
# ${i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.commands.defaultsToTheNameOfRackAppClassComment', {
    defaultMessage: 'Defaults to the name of your Rack app\'s class.',
  })}
# service_name: 'my-service'

# ${i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.commands.useIfApmServerRequiresTokenComment', {
    defaultMessage: 'Use if APM Server requires a token',
  })}
# secret_token: ''

# ${i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.commands.setCustomApmServerComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultServerUrl})',
    values: { defaultServerUrl: 'http://localhost:8200' },
  })}
# server_url: 'http://localhost:8200'`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/1.x/index.html' },
    }),
  },
];

export const JS_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.jsClient.enableRealUserMonitoring.title', {
      defaultMessage: 'Enable Real User Monitoring support in the APM server',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.jsClient.enableRealUserMonitoring.textPre', {
      defaultMessage: 'Please refer to [the documentation]({documentationLink}).',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/server/{config.docs.version}/rum.html' },
    }),
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.jsClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.jsClient.install.textPre', {
      defaultMessage: 'Install the APM agent for JavaScript as a dependency to your application:',
    }),
    commands: [`npm install elastic-apm-js-base --save`],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.jsClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.jsClient.configure.textPre', {
      defaultMessage: 'Agents are libraries that run inside of your application.',
    }),
    commands: `import {curlyOpen} init as initApm {curlyClose} from 'elastic-apm-js-base'
var apm = initApm({curlyOpen}

  // ${i18n.translate('kbn.server.tutorials.apm.jsClient.configure.commands.setRequiredServiceNameComment', {
    defaultMessage: 'Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)',
  })}
  serviceName: '',

  // ${i18n.translate('kbn.server.tutorials.apm.jsClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  serverUrl: '',

  // ${i18n.translate('kbn.server.tutorials.apm.jsClient.configure.commands.setServiceVersionComment', {
    defaultMessage: 'Set service version (required for sourcemap feature)',
  })}
  serviceVersion: ''
{curlyClose})`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.jsClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/js-base/current/index.html' },
    }),
  },
];

export const GO_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.goClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.goClient.install.textPre', {
      defaultMessage: 'Install the APM agent packages for Go.',
    }),
    commands: ['go get github.com/elastic/apm-agent-go'],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.goClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.goClient.configure.textPre', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the executable \
file name, or the `ELASTIC_APM_SERVICE_NAME` environment variable.',
    }),
    commands: `# ${i18n.translate('kbn.server.tutorials.apm.goClient.configure.commands.initializeUsingEnvironmentVariablesComment', {
      defaultMessage: 'Initialize using environment variables:',
    })}

# ${i18n.translate('kbn.server.tutorials.apm.goClient.configure.commands.setServiceNameComment', {
    defaultMessage: 'Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.',
  })}
# ${i18n.translate('kbn.server.tutorials.apm.goClient.configure.commands.usedExecutableNameComment', {
    defaultMessage: 'If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.',
  })}
export ELASTIC_APM_SERVICE_NAME=

# ${i18n.translate('kbn.server.tutorials.apm.goClient.configure.commands.setAmpServerUrlComment', {
    defaultMessage: 'Set the APM Server URL. If unspecified, the agent will effectively be disabled.',
  })}
export ELASTIC_APM_SERVER_URL=

# ${i18n.translate('kbn.server.tutorials.apm.goClient.configure.commands.setIfAmpServerRequiresTokenComment', {
    defaultMessage: 'Set if APM Server requires a token.',
  })}
export ELASTIC_APM_SECRET_TOKEN=
`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.goClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documenationLink}) for advanced configuration.',
      values: { documenationLink: '{config.docs.base_url}guide/en/apm/agent/go/current/configuration.html' },
    }),
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.goClient.instrument.title', {
      defaultMessage: 'Instrument your application',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.goClient.instrument.textPre', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'Instrument your Go application by using one of the provided instrumentation modules or \
by using the tracer API directly.',
    }),
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
    textPost: i18n.translate('kbn.server.tutorials.apm.goClient.instrument.textPost', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'See the [documentation]({documentationLink}) for a detailed \
guide to instrumenting Go source code.\n\nguide to instrumenting Go source \
code.\n\n**Warning: The Go agent is currently in Beta and not meant for production use.**',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/go/current/instrumenting-source.html' },
    }),
  },
];

export const JAVA_CLIENT_INSTRUCTIONS = [
  {
    title: i18n.translate('kbn.server.tutorials.apm.javaClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.javaClient.download.textPre', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'Download the agent jar from [Maven Central]({mavenCentralLink}). \
Do **not** add the agent as a dependency to your application.',
      values: { mavenCentralLink: 'http://search.maven.org/#search%7Cga%7C1%7Ca%3Aelastic-apm-agent' },
    }),
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.javaClient.startApplication.title', {
      defaultMessage: 'Start your application with the javaagent flag',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.javaClient.startApplication.textPre', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'Add the `-javaagent` flag and configure the agent with system properties.\n\n \
* Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)\n \
* Set custom APM Server URL (default: {customApmServerUrl})\n \
* Set the base package of your application',
      values: { customApmServerUrl: 'http://localhost:8200' },
    }),
    commands: `java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\
     -Delastic.apm.service_name=my-application \\
     -Delastic.apm.server_url=http://localhost:8200 \\
     -Delastic.apm.application_packages=org.example \\
     -jar my-application.jar`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.javaClient.startApplication.textPost', {
      // eslint-disable-next-line no-multi-str
      defaultMessage: 'See the [documentation]({documenationLink}) for configuration options and advanced \
usage.\n\n**Warning: The Java agent is currently in Beta and not meant for production use.**',
      values: { documenationLink: '{config.docs.base_url}guide/en/apm/agent/java/current/index.html' },
    }),
  },
];
