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

import { i18n } from '@kbn/i18n';

export const createNodeAgentInstructions = (apmServerUrl = '', secretToken = '') => [
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
      defaultMessage: 'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `serviceName`. \
This agent supports a vararity of frameworks but can also be used with your custom stack.',
    }),
    commands: `// ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.addThisToTheFileTopComment', {
      defaultMessage: 'Add this to the VERY top of the first file loaded in your app',
    })}
var apm = require('elastic-apm-node').start({curlyOpen}
  // ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.setRequiredServiceNameComment', {
    defaultMessage: 'Override service name from package.json',
  })}
  // ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.allowedCharactersComment', {
    defaultMessage: 'Allowed characters: a-z, A-Z, 0-9, -, _, and space',
  })}
  serviceName: '',

  // ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.useIfApmRequiresTokenComment', {
    defaultMessage: 'Use if APM Server requires a token',
  })}
  secretToken: '${secretToken}',

  // ${i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  serverUrl: '${apmServerUrl}'
{curlyClose})`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.nodeClient.configure.textPost', {
      defaultMessage: 'See [the documentation]({documentationLink}) for advanced usage, including how to use with \
[Babel/ES Modules]({babelEsModulesLink}).',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/nodejs/current/index.html',
        babelEsModulesLink: '{config.docs.base_url}guide/en/apm/agent/nodejs/current/advanced-setup.html#es-modules',
      },
    }),
  },
];

export const createDjangoAgentInstructions = (apmServerUrl = '', secretToken = '') => [
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
  'SECRET_TOKEN': '${secretToken}',

  # ${i18n.translate('kbn.server.tutorials.apm.djangoClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  'SERVER_URL': '${apmServerUrl}',
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
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/python/current/django-support.html' },
    }),
  },
];

export const createFlaskAgentInstructions = (apmServerUrl = '', secretToken = '') => [
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
  'SECRET_TOKEN': '${secretToken}',

  # ${i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  'SERVER_URL': '${apmServerUrl}',
{curlyClose}

apm = ElasticAPM(app)`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.flaskClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/python/current/flask-support.html' },
    }),
  },
];

export const createRailsAgentInstructions = (apmServerUrl = '', secretToken = '') => [
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
# secret_token: '${secretToken}'

# Set custom APM Server URL (default: http://localhost:8200)
# server_url: '${apmServerUrl || 'http://localhost:8200'}'`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.railsClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/current/index.html' },
    }),
  },
];

export const createRackAgentInstructions = (apmServerUrl = '', secretToken = '') => [
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
# secret_token: '${secretToken}'

# ${i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.commands.setCustomApmServerComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultServerUrl})',
    values: { defaultServerUrl: 'http://localhost:8200' },
  })}
# server_url: '${apmServerUrl || 'http://localhost:8200'}'`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.rackClient.createConfig.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/current/index.html' },
    }),
  },
];

export const createJsAgentInstructions = (apmServerUrl = '') => [
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
    commands: [`npm install @elastic/apm-rum --save`],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.jsClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.jsClient.configure.textPre', {
      defaultMessage: 'Agents are libraries that run inside of your application.',
    }),
    commands: `import {curlyOpen} init as initApm {curlyClose} from '@elastic/apm-rum'
var apm = initApm({curlyOpen}

  // ${i18n.translate('kbn.server.tutorials.apm.jsClient.configure.commands.setRequiredServiceNameComment', {
    defaultMessage: 'Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)',
  })}
  serviceName: '',

  // ${i18n.translate('kbn.server.tutorials.apm.jsClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
  serverUrl: '${apmServerUrl}',

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

export const createGoAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('kbn.server.tutorials.apm.goClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.goClient.install.textPre', {
      defaultMessage: 'Install the APM agent packages for Go.',
    }),
    commands: ['go get go.elastic.co/apm'],
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.goClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.goClient.configure.textPre', {
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
    defaultMessage:
        'If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.',
  })}
export ELASTIC_APM_SERVICE_NAME=

# ${i18n.translate('kbn.server.tutorials.apm.goClient.configure.commands.setCustomApmServerUrlComment', {
    defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
    values: { defaultApmServerUrl: 'http://localhost:8200' },
  })}
export ELASTIC_APM_SERVER_URL=${apmServerUrl}

# ${i18n.translate('kbn.server.tutorials.apm.goClient.configure.commands.useIfApmRequiresTokenComment', {
    defaultMessage: 'Use if APM Server requires a token',
  })}
export ELASTIC_APM_SECRET_TOKEN=${secretToken}
`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.goClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced configuration.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/go/current/configuration.html' },
    }),
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.goClient.instrument.title', {
      defaultMessage: 'Instrument your application',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.goClient.instrument.textPre', {
      defaultMessage: 'Instrument your Go application by using one of the provided instrumentation modules or \
by using the tracer API directly.',
    }),
    commands: `\
import (
	"net/http"

	"go.elastic.co/apm/module/apmhttp"
)

func main() {curlyOpen}
	mux := http.NewServeMux()
	...
	http.ListenAndServe(":8080", apmhttp.Wrap(mux))
{curlyClose}
`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.goClient.instrument.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for a detailed \
guide to instrumenting Go source code.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/go/current/instrumenting-source.html' },
    }),
  },
];

export const createJavaAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('kbn.server.tutorials.apm.javaClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.javaClient.download.textPre', {
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
      defaultMessage: 'Add the `-javaagent` flag and configure the agent with system properties.\n\n \
* Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)\n \
* Set custom APM Server URL (default: {customApmServerUrl})\n \
* Set the base package of your application',
      values: { customApmServerUrl: 'http://localhost:8200' },
    }),
    commands: `java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\
     -Delastic.apm.service_name=my-application \\
     -Delastic.apm.server_url=${apmServerUrl || 'http://localhost:8200'} \\
     -Delastic.apm.secret_token=${secretToken} \\
     -Delastic.apm.application_packages=org.example \\
     -jar my-application.jar`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.javaClient.startApplication.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for configuration options and advanced \
usage.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/java/current/index.html' },
    }),
  },
];

export const createDotNetAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('kbn.server.tutorials.apm.dotNetClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.dotNetClient.download.textPre', {
      defaultMessage: '**Warning: The .NET agent is currently in Beta and not meant for production use.** \n\n \
      Add the the agent package(s) from [NuGet]({allNuGetPacakgesLink}) to your .NET application. There are multiple \
      NuGet packages available for different use cases. \n\n  For an ASP.NET Core application with Entity Framework \
      Core download the [Elastic.Apm.All]({allApmPackageLink}) package. This package will automatically add every agent component to \
      your application. \n\n In case you would like to to minimize the dependencies, you can use the \
      [Elastic.Apm.AspNetCore]({aspNetCorePackageLink}) package for just \
      ASP.NET Core monitoring or the [Elastic.Apm.EfCore]({efCorePackageLink}) package for just Entity Framework Core monitoring. \n\n \
      In case you only want to use the public Agent API for manual instrumentation use the [Elastic.Apm]({elasticApmPackageLink}) package.',
      values: {
        allNuGetPacakgesLink: 'https://www.nuget.org/packages?q=Elastic.apm',
        allApmPackageLink: 'https://www.nuget.org/packages/Elastic.Apm.All',
        aspNetCorePackageLink: 'https://www.nuget.org/packages/Elastic.Apm.AspNetCore',
        efCorePackageLink: 'https://www.nuget.org/packages/Elastic.Apm.EntityFrameworkCore',
        elasticApmPackageLink: 'https://www.nuget.org/packages/Elastic.Apm',
      },
    }),
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.dotNetClient.configureApplication.title', {
      defaultMessage: 'Add the agent to the application',
    }),
    textPre: i18n.translate('kbn.server.tutorials.apm.dotNetClient.configureApplication.textPre', {
      defaultMessage: 'In case of ASP.NET Core, call the `UseElasticApm` method in the `Configure` method within the `Startup.cs` file.'
    }),
    commands: `public class Startup
{curlyOpen}
  public void Configure(IApplicationBuilder app, IHostingEnvironment env)
  {curlyOpen}
    app.UseElasticApm(Configuration);
    //…rest of the method
  {curlyClose}
  //…rest of the class
{curlyClose}`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.dotNetClient.configureApplication.textPost', {
      defaultMessage: 'Passing an `IConfiguration` instance is optional and by doing so, the agent will read config settings through this \
      `IConfiguration` instance (e.g. from the `appsettings.json` file).',
    }),
  },
  {
    title: i18n.translate('kbn.server.tutorials.apm.dotNetClient.configureAgent.title', {
      defaultMessage: 'Sample appsettings.json file:',
    }),
    commands: `{curlyOpen}
  "ElasticApm": {curlyOpen}
    "LogLevel": "Error",
    "SecretToken": "${secretToken}",
    "ServerUrls": "${apmServerUrl || 'http://localhost:8200'}", //Set custom APM Server URL (default: http://localhost:8200)
    "ServiceName" : "MyApp", //allowed characters: a-z, A-Z, 0-9, -, _, and space. Default is the entry assembly of the application
  {curlyClose}
{curlyClose}`.split('\n'),
    textPost: i18n.translate('kbn.server.tutorials.apm.dotNetClient.configureAgent.textPost', {
      defaultMessage: 'In case you don’t pass an `IConfiguration` instance to the agent (e.g. in case of non ASP.NET Core applications) \
      you can also configure the agent through environment variables. \n \
      See [the documentation]({documentationLink}) for advanced usage.',
      values: { documentationLink: '{config.docs.base_url}guide/en/apm/agent/dotnet/current/configuration.html' },
    }),
  },
];
