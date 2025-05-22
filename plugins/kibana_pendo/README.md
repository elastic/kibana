# Kibana Pendo Plugin
Plugin that allows us to run pendo inside the kibana iframe

## Build
run the following:
`nvm use`
`yarn build`


## Development
See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

### Important files:
Code that initializes and runs pendo is in public/plugin.ts
Code for the plugin status webpage is in public/components/app.tsx

## Debugging Pendo

### Plugin Status Page
There is a hidden page in analytics that lets you check the status of pendo at [vdx_url]/iq/kibanapendo
The page lets you check the status of the pendo plugin. It also allows you to copy a prebuilt link directly to kibana with the appropriate query parameters to initialize pendo when navigated to. This lets you access the kibana running inside the iframe directly. 

### Pendo Client Validation
To gain access to the pendo client validation do the following.
1. Navigate to [vdx_url]/iq/kibanapendo
2. Click the "Copy Plugin Url" button
3. Paste the url into a new tab
4. Open the developper console and run `pendo.validateEnvironment()`

### Pendo Debugging Tool
To debug from the agent do the following:
1. Open "https://app.eu.pendo.io/s/4743050067509248/admin/app/-323232?tab=agentSettings"
2. Click the "Debug" button in the Staging Environment section
3. Enter your environment url when prompted and click Launch
4. Navigate to the "Config" tab and scroll through the whole page and validate that there are no errors
5. Navigate to the "Events" tab, click "Enable event logging" and click around inside the iframe. Make sure you can see events being generated.

Note that enabling event logging can make your browser very slow. Make sure to stop event logging before looking at the events. 


## Scripts

<dl>
  <dt><code>yarn kbn bootstrap</code></dt>
  <dd>Execute this to install node_modules and setup the dependencies in your plugin and in Kibana</dd>

  <dt><code>yarn plugin-helpers build</code></dt>
  <dd>Execute this to create a distributable version of this plugin that can be installed in Kibana</dd>
</dl>
