/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const createNodeAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.nodeClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.nodeClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Node.js as a dependency to your application.',
    }),
    commands: ['npm install elastic-apm-node --save'],
  },
  {
    title: i18n.translate('apmOss.tutorial.nodeClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.nodeClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `serviceName`. \
This agent supports a variety of frameworks but can also be used with your custom stack.',
    }),
    commands: `// ${i18n.translate(
      'apmOss.tutorial.nodeClient.configure.commands.addThisToTheFileTopComment',
      {
        defaultMessage: 'Add this to the VERY top of the first file loaded in your app',
      }
    )}
var apm = require('elastic-apm-node').start({curlyOpen}

  // ${i18n.translate(
    'apmOss.tutorial.nodeClient.configure.commands.setRequiredServiceNameComment',
    {
      defaultMessage: 'Override the service name from package.json',
    }
  )}
  // ${i18n.translate('apmOss.tutorial.nodeClient.configure.commands.allowedCharactersComment', {
    defaultMessage: 'Allowed characters: a-z, A-Z, 0-9, -, _, and space',
  })}
  serviceName: '',

  // ${i18n.translate(
    'apmOss.tutorial.nodeClient.configure.commands.useIfApmRequiresTokenComment',
    {
      defaultMessage: 'Use if APM Server requires a secret token',
    }
  )}
  secretToken: '${secretToken}',

  // ${i18n.translate(
    'apmOss.tutorial.nodeClient.configure.commands.setCustomApmServerUrlComment',
    {
      defaultMessage: 'Set the custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    }
  )}
  serverUrl: '${apmServerUrl}',

  // ${i18n.translate(
    'apmOss.tutorial.nodeClient.configure.commands.setCustomServiceEnvironmentComment',
    {
      defaultMessage: 'Set the service environment',
    }
  )}
  environment: 'production'
{curlyClose})`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.nodeClient.configure.textPost', {
      defaultMessage:
        'See [the documentation]({documentationLink}) for advanced usage, including how to use with \
[Babel/ES Modules]({babelEsModulesLink}).',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/nodejs/current/index.html',
        babelEsModulesLink:
          '{config.docs.base_url}guide/en/apm/agent/nodejs/current/advanced-setup.html#es-modules',
      },
    }),
  },
];

export const createDjangoAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.djangoClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.djangoClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Python as a dependency.',
    }),
    commands: ['$ pip install elastic-apm'],
  },
  {
    title: i18n.translate('apmOss.tutorial.djangoClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.djangoClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `SERVICE_NAME`.',
    }),
    commands: `# ${i18n.translate(
      'apmOss.tutorial.djangoClient.configure.commands.addAgentComment',
      {
        defaultMessage: 'Add the agent to the installed apps',
      }
    )}
INSTALLED_APPS = (
  'elasticapm.contrib.django',
  # ...
)

ELASTIC_APM = {curlyOpen}
  # ${i18n.translate(
    'apmOss.tutorial.djangoClient.configure.commands.setRequiredServiceNameComment',
    {
      defaultMessage: 'Set the required service name. Allowed characters:',
    }
  )}
  # ${i18n.translate('apmOss.tutorial.djangoClient.configure.commands.allowedCharactersComment', {
    defaultMessage: 'a-z, A-Z, 0-9, -, _, and space',
  })}
  'SERVICE_NAME': '',

  # ${i18n.translate(
    'apmOss.tutorial.djangoClient.configure.commands.useIfApmServerRequiresTokenComment',
    {
      defaultMessage: 'Use if APM Server requires a secret token',
    }
  )}
  'SECRET_TOKEN': '${secretToken}',

  # ${i18n.translate(
    'apmOss.tutorial.djangoClient.configure.commands.setCustomApmServerUrlComment',
    {
      defaultMessage: 'Set the custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    }
  )}
  'SERVER_URL': '${apmServerUrl}',

  # ${i18n.translate(
    'apmOss.tutorial.djangoClient.configure.commands.setServiceEnvironmentComment',
    {
      defaultMessage: 'Set the service environment',
    }
  )}
  'ENVIRONMENT': 'production',
{curlyClose}

# ${i18n.translate('apmOss.tutorial.djangoClient.configure.commands.addTracingMiddlewareComment', {
      defaultMessage: 'To send performance metrics, add our tracing middleware:',
    })}
MIDDLEWARE = (
  'elasticapm.contrib.django.middleware.TracingMiddleware',
  #...
)`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.djangoClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/python/current/django-support.html',
      },
    }),
  },
];

export const createFlaskAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.flaskClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.flaskClient.install.textPre', {
      defaultMessage: 'Install the APM agent for Python as a dependency.',
    }),
    commands: ['$ pip install elastic-apm[flask]'],
  },
  {
    title: i18n.translate('apmOss.tutorial.flaskClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.flaskClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the `SERVICE_NAME`.',
    }),
    commands: `# ${i18n.translate(
      'apmOss.tutorial.flaskClient.configure.commands.initializeUsingEnvironmentVariablesComment',
      {
        defaultMessage: 'initialize using environment variables',
      }
    )}
from elasticapm.contrib.flask import ElasticAPM
app = Flask(__name__)
apm = ElasticAPM(app)

# ${i18n.translate('apmOss.tutorial.flaskClient.configure.commands.configureElasticApmComment', {
      defaultMessage: "or configure to use ELASTIC_APM in your application's settings",
    })}
from elasticapm.contrib.flask import ElasticAPM
app.config['ELASTIC_APM'] = {curlyOpen}
  # ${i18n.translate(
    'apmOss.tutorial.flaskClient.configure.commands.setRequiredServiceNameComment',
    {
      defaultMessage: 'Set the required service name. Allowed characters:',
    }
  )}
  # ${i18n.translate('apmOss.tutorial.flaskClient.configure.commands.allowedCharactersComment', {
    defaultMessage: 'a-z, A-Z, 0-9, -, _, and space',
  })}
  'SERVICE_NAME': '',

  # ${i18n.translate(
    'apmOss.tutorial.flaskClient.configure.commands.useIfApmServerRequiresTokenComment',
    {
      defaultMessage: 'Use if APM Server requires a secret token',
    }
  )}
  'SECRET_TOKEN': '${secretToken}',

  # ${i18n.translate(
    'apmOss.tutorial.flaskClient.configure.commands.setCustomApmServerUrlComment',
    {
      defaultMessage: 'Set the custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    }
  )}
  'SERVER_URL': '${apmServerUrl}',

  # ${i18n.translate(
    'apmOss.tutorial.flaskClient.configure.commands.setServiceEnvironmentComment',
    {
      defaultMessage: 'Set the service environment',
    }
  )}
  'ENVIRONMENT': 'production',
{curlyClose}

apm = ElasticAPM(app)`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.flaskClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced usage.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/python/current/flask-support.html',
      },
    }),
  },
];

export const createRailsAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.railsClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.railsClient.install.textPre', {
      defaultMessage: 'Add the agent to your Gemfile.',
    }),
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: i18n.translate('apmOss.tutorial.railsClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.railsClient.configure.textPre', {
      defaultMessage:
        'APM is automatically started when your app boots. Configure the agent, by creating the config file {configFile}',
      values: { configFile: '`config/elastic_apm.yml`' },
    }),
    commands: `# config/elastic_apm.yml:

# Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
# Defaults to the name of your Rails app
service_name: 'my-service'

# Use if APM Server requires a secret token
secret_token: '${secretToken}'

# Set the custom APM Server URL (default: http://localhost:8200)
server_url: '${apmServerUrl || 'http://localhost:8200'}'

# Set the service environment
environment: 'production'`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.railsClient.configure.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/current/index.html',
      },
    }),
  },
];

export const createRackAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.rackClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.rackClient.install.textPre', {
      defaultMessage: 'Add the agent to your Gemfile.',
    }),
    commands: [`gem 'elastic-apm'`],
  },
  {
    title: i18n.translate('apmOss.tutorial.rackClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.rackClient.configure.textPre', {
      defaultMessage:
        'For Rack or a compatible framework (e.g. Sinatra), include the middleware in your app and start the agent.',
    }),
    commands: `# config.ru
  require 'sinatra/base'

  class MySinatraApp < Sinatra::Base
    use ElasticAPM::Middleware

    # ...
  end

  ElasticAPM.start(
    app: MySinatraApp, # ${i18n.translate(
      'apmOss.tutorial.rackClient.configure.commands.requiredComment',
      {
        defaultMessage: 'required',
      }
    )}
    config_file: '' # ${i18n.translate(
      'apmOss.tutorial.rackClient.configure.commands.optionalComment',
      {
        defaultMessage: 'optional, defaults to config/elastic_apm.yml',
      }
    )}
  )

  run MySinatraApp

  at_exit {curlyOpen} ElasticAPM.stop {curlyClose}`.split('\n'),
  },
  {
    title: i18n.translate('apmOss.tutorial.rackClient.createConfig.title', {
      defaultMessage: 'Create config file',
    }),
    textPre: i18n.translate('apmOss.tutorial.rackClient.createConfig.textPre', {
      defaultMessage: 'Create a config file {configFile}:',
      values: { configFile: '`config/elastic_apm.yml`' },
    }),
    commands: `# config/elastic_apm.yml:

# ${i18n.translate('apmOss.tutorial.rackClient.createConfig.commands.setServiceNameComment', {
      defaultMessage: 'Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space',
    })}
# ${i18n.translate(
      'apmOss.tutorial.rackClient.createConfig.commands.defaultsToTheNameOfRackAppClassComment',
      {
        defaultMessage: "Defaults to the name of your Rack app's class.",
      }
    )}
service_name: 'my-service'

# ${i18n.translate(
      'apmOss.tutorial.rackClient.createConfig.commands.useIfApmServerRequiresTokenComment',
      {
        defaultMessage: 'Use if APM Server requires a token',
      }
    )}
secret_token: '${secretToken}'

# ${i18n.translate('apmOss.tutorial.rackClient.createConfig.commands.setCustomApmServerComment', {
      defaultMessage: 'Set custom APM Server URL (default: {defaultServerUrl})',
      values: { defaultServerUrl: 'http://localhost:8200' },
    })}
server_url: '${apmServerUrl || 'http://localhost:8200'}',

# ${i18n.translate('apmOss.tutorial.rackClient.createConfig.commands.setServiceEnvironment', {
      defaultMessage: 'Set the service environment',
    })}
environment: 'production'`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.rackClient.createConfig.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/ruby/current/index.html',
      },
    }),
  },
];

export const createJsAgentInstructions = (apmServerUrl = '') => [
  {
    title: i18n.translate('apmOss.tutorial.jsClient.enableRealUserMonitoring.title', {
      defaultMessage: 'Enable Real User Monitoring support in APM Server',
    }),
    textPre: i18n.translate('apmOss.tutorial.jsClient.enableRealUserMonitoring.textPre', {
      defaultMessage:
        'APM Server disables RUM support by default. See the [documentation]({documentationLink}) \
for details on how to enable RUM support.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/server/{config.docs.version}/configuration-rum.html',
      },
    }),
  },
  {
    title: i18n.translate('apmOss.tutorial.jsClient.installDependency.title', {
      defaultMessage: 'Set up the Agent as a dependency',
    }),
    textPre: i18n.translate('apmOss.tutorial.jsClient.installDependency.textPre', {
      defaultMessage:
        'You can install the Agent as a dependency to your application with \
`npm install @elastic/apm-rum --save`.\n\n\
The Agent can then be initialized and configured in your application like this:',
    }),
    commands: `import {curlyOpen} init as initApm {curlyClose} from '@elastic/apm-rum'
var apm = initApm({curlyOpen}

  // ${i18n.translate(
    'apmOss.tutorial.jsClient.installDependency.commands.setRequiredServiceNameComment',
    {
      defaultMessage:
        'Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)',
    }
  )}
  serviceName: 'your-app-name',

  // ${i18n.translate(
    'apmOss.tutorial.jsClient.installDependency.commands.setCustomApmServerUrlComment',
    {
      defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    }
  )}
  serverUrl: '${apmServerUrl}',

  // ${i18n.translate(
    'apmOss.tutorial.jsClient.installDependency.commands.setServiceVersionComment',
    {
      defaultMessage: 'Set the service version (required for source map feature)',
    }
  )}
  serviceVersion: '',

  // ${i18n.translate(
    'apmOss.tutorial.jsClient.installDependency.commands.setServiceEnvironmentComment',
    {
      defaultMessage: 'Set the service environment',
    }
  )}
  environment: 'production'
{curlyClose})`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.jsClient.installDependency.textPost', {
      defaultMessage:
        'Framework integrations, like React or Angular, have custom dependencies. \
See the [integration documentation]({docLink}) for more information.',
      values: {
        docLink:
          '{config.docs.base_url}guide/en/apm/agent/rum-js/current/framework-integrations.html',
      },
    }),
  },
  {
    title: i18n.translate('apmOss.tutorial.jsClient.scriptTags.title', {
      defaultMessage: 'Set up the Agent with Script Tags',
    }),
    textPre: i18n.translate('apmOss.tutorial.jsClient.scriptTags.textPre', {
      defaultMessage:
        "Alternatively, you can use Script tags to set up and configure the Agent. \
Add a `<script>` tag to the HTML page and use the `elasticApm` global object to load and initialize the agent. \
Don't forget to download the latest version of the RUM Agent from [GitHub]({GitHubLink}) or [UNPKG]({UnpkgLink}), \
and host the file on your Server/CDN before deploying to production.",
      values: {
        GitHubLink: 'https://github.com/elastic/apm-agent-rum-js/releases/latest',
        UnpkgLink: 'https://unpkg.com/@elastic/apm-rum/dist/bundles/elastic-apm-rum.umd.min.js',
      },
    }),
    commands: `\
<script src="https://your-cdn-host.com/path/to/elastic-apm-rum.umd.min.js" crossorigin></script>
<script>
  elasticApm.init({curlyOpen}
    serviceName: 'your-app-name',
    serverUrl: 'http://localhost:8200',
  {curlyClose})
</script>
`.split('\n'),
  },
];

export const createGoAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.goClient.install.title', {
      defaultMessage: 'Install the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.goClient.install.textPre', {
      defaultMessage: 'Install the APM agent packages for Go.',
    }),
    commands: ['go get go.elastic.co/apm'],
  },
  {
    title: i18n.translate('apmOss.tutorial.goClient.configure.title', {
      defaultMessage: 'Configure the agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.goClient.configure.textPre', {
      defaultMessage:
        'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the executable \
file name, or the `ELASTIC_APM_SERVICE_NAME` environment variable.',
    }),
    commands: `# ${i18n.translate(
      'apmOss.tutorial.goClient.configure.commands.initializeUsingEnvironmentVariablesComment',
      {
        defaultMessage: 'Initialize using environment variables:',
      }
    )}

# ${i18n.translate('apmOss.tutorial.goClient.configure.commands.setServiceNameComment', {
      defaultMessage: 'Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.',
    })}
# ${i18n.translate('apmOss.tutorial.goClient.configure.commands.usedExecutableNameComment', {
      defaultMessage:
        'If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.',
    })}
export ELASTIC_APM_SERVICE_NAME=

# ${i18n.translate('apmOss.tutorial.goClient.configure.commands.setCustomApmServerUrlComment', {
      defaultMessage: 'Set custom APM Server URL (default: {defaultApmServerUrl})',
      values: { defaultApmServerUrl: 'http://localhost:8200' },
    })}
export ELASTIC_APM_SERVER_URL=${apmServerUrl}

# ${i18n.translate('apmOss.tutorial.goClient.configure.commands.useIfApmRequiresTokenComment', {
      defaultMessage: 'Use if APM Server requires a secret token',
    })}
export ELASTIC_APM_SECRET_TOKEN=${secretToken}

# ${i18n.translate('apmOss.tutorial.goClient.configure.commands.setServiceEnvironment', {
      defaultMessage: 'Set the service environment',
    })}
export ELASTIC_APM_ENVIRONMENT=
`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.goClient.configure.textPost', {
      defaultMessage: 'See the [documentation]({documentationLink}) for advanced configuration.',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/go/current/configuration.html',
      },
    }),
  },
  {
    title: i18n.translate('apmOss.tutorial.goClient.instrument.title', {
      defaultMessage: 'Instrument your application',
    }),
    textPre: i18n.translate('apmOss.tutorial.goClient.instrument.textPre', {
      defaultMessage:
        'Instrument your Go application by using one of the provided instrumentation modules or \
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
    textPost: i18n.translate('apmOss.tutorial.goClient.instrument.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for a detailed \
guide to instrumenting Go source code.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/go/current/instrumenting-source.html',
      },
    }),
  },
];

export const createJavaAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.javaClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.javaClient.download.textPre', {
      defaultMessage:
        'Download the agent jar from [Maven Central]({mavenCentralLink}). \
Do **not** add the agent as a dependency to your application.',
      values: {
        mavenCentralLink: 'http://search.maven.org/#search%7Cga%7C1%7Ca%3Aelastic-apm-agent',
      },
    }),
  },
  {
    title: i18n.translate('apmOss.tutorial.javaClient.startApplication.title', {
      defaultMessage: 'Start your application with the javaagent flag',
    }),
    textPre: i18n.translate('apmOss.tutorial.javaClient.startApplication.textPre', {
      defaultMessage:
        'Add the `-javaagent` flag and configure the agent with system properties.\n\n \
* Set the required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)\n \
* Set the custom APM Server URL (default: {customApmServerUrl})\n \
* Set the APM Server secret token\n \
* Set the service environment\n \
* Set the base package of your application',
      values: { customApmServerUrl: 'http://localhost:8200' },
    }),
    commands: `java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\
     -Delastic.apm.service_name=my-application \\
     -Delastic.apm.server_urls=${apmServerUrl || 'http://localhost:8200'} \\
     -Delastic.apm.secret_token=${secretToken} \\
     -Delastic.apm.environment=production \\
     -Delastic.apm.application_packages=org.example \\
     -jar my-application.jar`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.javaClient.startApplication.textPost', {
      defaultMessage:
        'See the [documentation]({documentationLink}) for configuration options and advanced \
usage.',
      values: {
        documentationLink: '{config.docs.base_url}guide/en/apm/agent/java/current/index.html',
      },
    }),
  },
];

export const createDotNetAgentInstructions = (apmServerUrl = '', secretToken = '') => [
  {
    title: i18n.translate('apmOss.tutorial.dotNetClient.download.title', {
      defaultMessage: 'Download the APM agent',
    }),
    textPre: i18n.translate('apmOss.tutorial.dotNetClient.download.textPre', {
      defaultMessage:
        'Add the the agent package(s) from [NuGet]({allNuGetPackagesLink}) to your .NET application. There are multiple \
      NuGet packages available for different use cases. \n\nFor an ASP.NET Core application with Entity Framework \
      Core download the [Elastic.Apm.NetCoreAll]({netCoreAllApmPackageLink}) package. This package will automatically add every \
      agent component to your application. \n\n In case you would like to to minimize the dependencies, you can use the \
      [Elastic.Apm.AspNetCore]({aspNetCorePackageLink}) package for just \
      ASP.NET Core monitoring or the [Elastic.Apm.EfCore]({efCorePackageLink}) package for just Entity Framework Core monitoring. \n\n \
      In case you only want to use the public Agent API for manual instrumentation use the [Elastic.Apm]({elasticApmPackageLink}) package.',
      values: {
        allNuGetPackagesLink: 'https://www.nuget.org/packages?q=Elastic.apm',
        netCoreAllApmPackageLink: 'https://www.nuget.org/packages/Elastic.Apm.NetCoreAll',
        aspNetCorePackageLink: 'https://www.nuget.org/packages/Elastic.Apm.AspNetCore',
        efCorePackageLink: 'https://www.nuget.org/packages/Elastic.Apm.EntityFrameworkCore',
        elasticApmPackageLink: 'https://www.nuget.org/packages/Elastic.Apm',
      },
    }),
  },
  {
    title: i18n.translate('apmOss.tutorial.dotNetClient.configureApplication.title', {
      defaultMessage: 'Add the agent to the application',
    }),
    textPre: i18n.translate('apmOss.tutorial.dotNetClient.configureApplication.textPre', {
      defaultMessage:
        'In case of ASP.NET Core with the `Elastic.Apm.NetCoreAll` package, call the `UseAllElasticApm` \
      method in the `Configure` method within the `Startup.cs` file.',
    }),
    commands: `public class Startup
{curlyOpen}
  public void Configure(IApplicationBuilder app, IHostingEnvironment env)
  {curlyOpen}
    app.UseAllElasticApm(Configuration);
    //…rest of the method
  {curlyClose}
  //…rest of the class
{curlyClose}`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.dotNetClient.configureApplication.textPost', {
      defaultMessage:
        'Passing an `IConfiguration` instance is optional and by doing so, the agent will read config settings through this \
      `IConfiguration` instance (e.g. from the `appsettings.json` file).',
    }),
  },
  {
    title: i18n.translate('apmOss.tutorial.dotNetClient.configureAgent.title', {
      defaultMessage: 'Sample appsettings.json file:',
    }),
    commands: `{curlyOpen}
    "ElasticApm": {curlyOpen}
    "SecretToken": "${secretToken}",
    "ServerUrls": "${
      apmServerUrl || 'http://localhost:8200'
    }", //Set custom APM Server URL (default: http://localhost:8200)
    "ServiceName": "MyApp", //allowed characters: a-z, A-Z, 0-9, -, _, and space. Default is the entry assembly of the application
    "Environment": "production", // Set the service environment
  {curlyClose}
{curlyClose}`.split('\n'),
    textPost: i18n.translate('apmOss.tutorial.dotNetClient.configureAgent.textPost', {
      defaultMessage:
        'In case you don’t pass an `IConfiguration` instance to the agent (e.g. in case of non ASP.NET Core applications) \
      you can also configure the agent through environment variables. \n \
      See [the documentation]({documentationLink}) for advanced usage.',
      values: {
        documentationLink:
          '{config.docs.base_url}guide/en/apm/agent/dotnet/current/configuration.html',
      },
    }),
  },
];
