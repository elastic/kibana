[Home](./index) &gt; [kibana](./kibana.md)

## kibana package

## Classes

|  Class | Description |
|  --- | --- |
|  [FlyoutRef](./kibana.flyoutref.md) | A FlyoutRef is a reference to an opened flyout panel. It offers methods to close the flyout panel again. If you open a flyout panel you should make sure you call <code>close()</code> when it should be closed. Since a flyout could also be closed by a user or from another flyout being opened, you must bind to the <code>onClose</code> Promise on the FlyoutRef instance. The Promise will resolve whenever the flyout was closed at which point you should discard the FlyoutRef. |
|  [ToastsSetup](./kibana.toastssetup.md) |  |
|  [UiSettingsClient](./kibana.uisettingsclient.md) |  |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ChromeBrand](./kibana.chromebrand.md) |  |
|  [ChromeBreadcrumb](./kibana.chromebreadcrumb.md) |  |
|  [CoreSetup](./kibana.coresetup.md) | Core services exposed to the start lifecycle |
|  [OverlaySetup](./kibana.overlaysetup.md) |  |
|  [Plugin](./kibana.plugin.md) | The interface that should be returned by a <code>PluginInitializer</code>. |
|  [PluginInitializerContext](./kibana.plugininitializercontext.md) | The available core services passed to a <code>PluginInitializer</code> |
|  [PluginSetupContext](./kibana.pluginsetupcontext.md) | The available core services passed to a plugin's <code>Plugin#setup</code> method. |
|  [UiSettingsState](./kibana.uisettingsstate.md) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [BasePathSetup](./kibana.basepathsetup.md) |  |
|  [ChromeHelpExtension](./kibana.chromehelpextension.md) |  |
|  [ChromeSetup](./kibana.chromesetup.md) |  |
|  [FatalErrorsSetup](./kibana.fatalerrorssetup.md) |  |
|  [HttpSetup](./kibana.httpsetup.md) |  |
|  [I18nSetup](./kibana.i18nsetup.md) |  |
|  [InjectedMetadataSetup](./kibana.injectedmetadatasetup.md) |  |
|  [NotificationsSetup](./kibana.notificationssetup.md) |  |
|  [PluginInitializer](./kibana.plugininitializer.md) | The <code>plugin</code> export at the root of a plugin's <code>public</code> directory should conform to this interface. |
|  [ToastInput](./kibana.toastinput.md) |  |
|  [UiSettingsSetup](./kibana.uisettingssetup.md) |  |

