# Guided Onboarding

This plugin contains the code for the Guided Onboarding project. Guided onboarding consists of guides for Solutions (Enterprise Search, Observability, Security) that can be completed as a checklist of steps. The guides help users to ingest their data and to navigate to the correct Solutions pages. 

The guided onboarding plugin includes a client-side code for the UI and the server-side code for the internal API. The server-side code is not intended for external use. 

The client-side code registers a button in the Kibana header that controls the guided onboarding panel (checklist) depending on the current state. There is also an API service exposed from the client-side start contract. The API service is intended for external use by other plugins.

---
## Current functionality

The solution plugins register their config that specifies the title, the description and the steps of a guide. The config is fetched via an http request to a guided onboarding endpoint. This endpoint should only be used internally by the guided onboarding API service. The configs are basically just `js` objects that are loaded into the Kibana server memory on startup. Because configs are not expected to be changed by the user, we don’t need to use saved objects.

The UI uses the guide config to display the guide: its title, description and steps. Each step has a title, a description and a url where the user will be redirected when they start this step. When a step is completed, the dropdown panel will automatically open and display the next step. When a guide is completed, the panel will automatically open and display a completion message with a button that (optionally) redirects the user to a specific solution page.

A step is completed on the solution page code by calling a function in the guided onboarding API service when the user performs an expected action. A step can also be set to “manual completion” which means the dropdown will not automatically open and the user will only see a popover on the header button on step completion. That way, the UI allows the user to stay a little longer on the page after completing the expected action and explore.

The plugin’s state keeps track of which guide has been started and its current progress. The state also includes the information if the user has started any guide, has completed any guide or if they skipped the guided onboarding, or if they quit the guide before completion. We also store the date when the user first looked at the landing page and if they haven't started any guide, the header button is displayed for the first 30 days. When clicked, the button redirects the user back to the landing page to start a guide.

## Architecture description
The guided onboarding is currently implemented in a separate `guided_onboarding` plugin that contains the code for the header button ([link](https://github.com/elastic/kibana/blob/main/src/plugins/guided_onboarding/public/components/guide_button.tsx)), the dropdown panel ([link](https://github.com/elastic/kibana/blob/main/src/plugins/guided_onboarding/public/components/guide_panel.tsx)) and the API service ([link](https://github.com/elastic/kibana/blob/main/src/plugins/guided_onboarding/public/services/api.service.ts)) exposed out of the client side that can be used by other plugins to get/update the state of the guided onboarding.

For example, when a user goes through the SIEM guide they are first taken to the integrations page where they follow some EUI tour steps and install the Elastic Agent and the Elastic Defend integration. The code on the integrations page uses the guided onboarding API service to check if a guide for the Elastic Defend integration is currently in progress. If yes, the page will display the EUI tour steps to guide the user. The page will also use the API service to update the guided onboarding state to the next step when the user completes the installation.

There is also a server side in the guided onboarding plugin that creates several endpoints for plugin only internal use. The endpoints are for fetching the guide configs, the state of the guided onboarding and to update the state.
The server side also exposes a function ([link](https://github.com/elastic/kibana/blob/main/src/plugins/guided_onboarding/server/plugin.ts#L40)) that is used by consumers to register their guide configs. That way the config files are a part of the consumers code and the guided onboarding is only used as a framework.

Another part of the guided onboarding code is in the home plugin where the code for the landing page ([link](https://github.com/elastic/kibana/tree/main/src/plugins/home/public/application/components/guided_onboarding)) is situated. The landing page can be found under `/app/home#/getting_started` and there is some logic ([link](https://github.com/elastic/kibana/blob/main/src/plugins/home/public/application/components/home.tsx#L200)) that redirects the user to the landing page when the deployment is new (i.e. there is no data in the deployment). Some of the static components for the landing page were extracted to the `kbn-guided-onboarding package ([link](https://github.com/elastic/kibana/tree/main/packages/kbn-guided-onboarding)).

When starting Kibana with `yarn start --run-examples` the `guided_onboarding_example` plugin ([link](https://github.com/elastic/kibana/tree/main/examples/guided_onboarding_example)) can be found under `/app/guidedOnboardingExample`. This page displays the current state of the guided onboarding and allows setting the state to any point in the guide. Otherwise, it can be difficult and time consuming to reach a specific step in a production guide during dev work. The example plugin also registers a config for a test guide that can be completed on the pages of the example plugin. The test guide is also used for unit and functional tests of the guided onboarding plugin.

## Development

1. Guided onboarding is only enabled on cloud. Update your `kibana.dev.yml` file with `xpack.cloud.id: 'testID'` to imitate the Cloud environment.

2. Start Kibana with the example plugins enabled: `yarn start --run-examples`. 

3. Navigate to `/app/home#/getting_started` to view the onboarding landing page and start a guide. Alternatively, you can also start a guide within the guided onboarding example plugin at `/app/guidedOnboardingExample`. The example plugin includes a sample guide that showcases the framework's capabilities. It also provides a form to dynamically start a guide at a specific step.

## Client side: API service
*Also see `KIBANA_FOLDER/examples/guided_onboarding_example` for code examples.*

The guided onboarding plugin exposes an API service from its start contract that is intended to be used by other plugins. The API service allows consumers to access the current state of the guided onboarding process and manipulate it. 

To use the API service in your plugin, declare the guided onboarding plugin as a dependency in the file `kibana.json` of your plugin. Add the API service to your plugin's start dependencies to rely on the provided TypeScript interface:
```
export interface AppPluginStartDependencies {
  guidedOnboarding: GuidedOnboardingPluginStart;
}
```
The API service is now available to your plugin in the setup lifecycle function of your plugin
```
// startDependencies is of type AppPluginStartDependencies
const [coreStart, startDependencies] = await core.getStartServices();
```
or in the start lifecycle function of your plugin.
```
public start(core: CoreStart, startDependencies: AppPluginStartDependencies) {
  ...
}
```

### isGuideStepActive$(guideId: GuideId, stepId: GuideStepIds): Observable\<boolean\>
*Also see `KIBANA_FOLDER/examples/guided_onboarding_example/public/components/step_one.tsx`.*

The API service exposes an Observable that contains a boolean value for the state of a specific guide step. For example, if your plugin needs to check if the "Add data" step of the SIEM guide is currently active, you could use the following code snippet. 

```
const { guidedOnboardingApi } = guidedOnboarding;
const isDataStepActive = useObservable(guidedOnboardingApi!.isGuideStepActive$('siem', 'add_data'));
useEffect(() => {
    // do some logic depending on the step state
}, [isDataStepActive]);
```

Alternatively, you can subscribe to the Observable directly. 
```
useEffect(() => {
    const subscription = guidedOnboardingApi?.isGuideStepActive$('siem', 'add_data').subscribe((isDataStepACtive) => {
      // do some logic depending on the step state 
    });
    return () => subscription?.unsubscribe();
}, [guidedOnboardingApi]);
```

### isGuideStepReadyToComplete$(guideId: GuideId, stepId: GuideStepIds): Observable\<boolean\>
Similar to `isGuideStepActive$`, the observable `isGuideStepReadyToComplete$` can be used to track the state of a step that is configured for manual completion. The observable broadcasts `true` when the manual completion popover is displayed and the user can mark the step "done". In this state the step is not in progress anymore but is not yet fully completed. 


### completeGuideStep(guideId: GuideId, stepId: GuideStepIds): Promise\<{ pluginState: PluginState } | undefined\>
The API service exposes an async function to mark a guide step as completed. 
If the specified guide step is not currently active, the function is a noop. In that case the return value is `undefined`, 
otherwise an updated `PluginState` is returned.

```
await guidedOnboardingApi?.completeGuideStep('siem', 'add_data');
```

## Guides config
To use the API service, you need to know a guide ID (currently one of `search`, `kubernetes`, `siem`) and a step ID (for example, `add_data`, `search_experience`, `rules` etc). The consumers of guided onboarding register their guide configs themselves and have therefore full control over the guide ID and step IDs used for their guide. For more details on registering a guide config, see below. 

## Server side: register a guide config
The guided onboarding exposes a function `registerGuideConfig(guideId: GuideId, guideConfig: GuideConfig)` function in its setup contract. This function allows consumers to register a guide config for a specified guide ID. The function throws an error if a config already exists for the guide ID. See code examples in following plugins: 

- enterprise search: `x-pack/plugins/enterprise_search/server/plugin.ts`
- observability: `x-pack/plugins/observability/server/plugin.ts`
- security solution: `x-pack/plugins/security_solution/server/plugin.ts`

