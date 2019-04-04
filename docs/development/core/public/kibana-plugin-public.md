[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md)

## kibana-plugin-public package

## Classes

|  Class | Description |
|  --- | --- |
|  [FlyoutRef](./kibana-plugin-public.flyoutref.md) | A FlyoutSession describes the session of one opened flyout panel. It offers methods to close the flyout panel again. If you open a flyout panel you should make sure you call <code>close()</code> when it should be closed. Since a flyout could also be closed without calling this method (e.g. because the user closes it), you must listen to the "closed" event on this instance. It will be emitted whenever the flyout will be closed and you should throw away your reference to this instance whenever you receive that event. |
|  [ToastsSetup](./kibana-plugin-public.toastssetup.md) |  |
|  [UiSettingsClient](./kibana-plugin-public.uisettingsclient.md) |  |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ChromeBrand](./kibana-plugin-public.chromebrand.md) |  |
|  [ChromeBreadcrumb](./kibana-plugin-public.chromebreadcrumb.md) |  |
|  [CoreSetup](./kibana-plugin-public.coresetup.md) | Core services exposed to the start lifecycle |
|  [OverlaySetup](./kibana-plugin-public.overlaysetup.md) |  |
|  [Plugin](./kibana-plugin-public.plugin.md) | The interface that should be returned by a <code>PluginInitializer</code>. |
|  [PluginInitializerContext](./kibana-plugin-public.plugininitializercontext.md) | The available core services passed to a <code>PluginInitializer</code> |
|  [PluginSetupContext](./kibana-plugin-public.pluginsetupcontext.md) | The available core services passed to a plugin's <code>Plugin#setup</code> method. |
|  [UiSettingsState](./kibana-plugin-public.uisettingsstate.md) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [BasePathSetup](./kibana-plugin-public.basepathsetup.md) |  |
|  [ChromeHelpExtension](./kibana-plugin-public.chromehelpextension.md) |  |
|  [ChromeSetup](./kibana-plugin-public.chromesetup.md) |  |
|  [FatalErrorsSetup](./kibana-plugin-public.fatalerrorssetup.md) |  |
|  [HttpSetup](./kibana-plugin-public.httpsetup.md) |  |
|  [I18nSetup](./kibana-plugin-public.i18nsetup.md) |  |
|  [InjectedMetadataSetup](./kibana-plugin-public.injectedmetadatasetup.md) |  |
|  [NotificationsSetup](./kibana-plugin-public.notificationssetup.md) |  |
|  [PluginInitializer](./kibana-plugin-public.plugininitializer.md) | The <code>plugin</code> export at the root of a plugin's <code>public</code> directory should conform to this interface. |
|  [ToastInput](./kibana-plugin-public.toastinput.md) |  |
|  [UiSettingsSetup](./kibana-plugin-public.uisettingssetup.md) |  |

