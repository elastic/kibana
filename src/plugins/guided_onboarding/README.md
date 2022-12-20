# Guided Onboarding

This plugin contains the code for the Guided Onboarding project. Guided onboarding consists of guides for Solutions (Enterprise Search, Observability, Security) that can be completed as a checklist of steps. The guides help users to ingest their data and to navigate to the correct Solutions pages. 

The guided onboarding plugin includes a client-side code for the UI and the server-side code for the internal API. The server-side code is not intended for external use. 

The client-side code registers a button in the Kibana header that controls the guided onboarding panel (checklist) depending on the current state. There is also an API service exposed from the client-side start contract. The API service is intended for external use by other plugins.

---

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

