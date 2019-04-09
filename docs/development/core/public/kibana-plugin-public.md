[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md)

## kibana-plugin-public package

## Classes

|  Class | Description |
|  --- | --- |
|  [FlyoutRef](./kibana-plugin-public.flyoutref.md) | A FlyoutRef is a reference to an opened flyout panel. It offers methods to close the flyout panel again. If you open a flyout panel you should make sure you call <code>close()</code> when it should be closed. Since a flyout could also be closed by a user or from another flyout being opened, you must bind to the <code>onClose</code> Promise on the FlyoutRef instance. The Promise will resolve whenever the flyout was closed at which point you should discard the FlyoutRef. |
|  [ToastsSetup](./kibana-plugin-public.toastssetup.md) |  |
|  [UiSettingsClient](./kibana-plugin-public.uisettingsclient.md) |  |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [Capabilities](./kibana-plugin-public.capabilities.md) | The read-only set of capabilities available for the current UI session. Capabilities are simple key-value pairs of (string, boolean), where the string denotes the capability ID, and the boolean is a flag indicating if the capability is enabled or disabled. |
|  [CapabilitiesSetup](./kibana-plugin-public.capabilitiessetup.md) | Capabilities Setup. |
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

