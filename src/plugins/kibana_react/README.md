# `kibana-react`

Tools for building React applications in Kibana.

## Context

You can create React context that holds Core or plugin services that your plugin depends on.

```ts
import { createKibanaReactContext } from 'kibana-react';

class MyPlugin {
  start(core, plugins) {
    const context = createKibanaReactContext({ ...core, ...plugins });
  }
}
```

You may also want to be explicit about services you depend on.

```ts
import { createKibanaReactContext } from 'kibana-react';

class MyPlugin {
  start({ notifications, overlays }, { embeddable }) {
    const context = createKibanaReactContext({ notifications, overlays, embeddable });
  }
}
```

Wrap your React application in the created context.

```jsx
<context.Provider>
  <KibanaApplication />
</context.Provider>
```

Or use already pre-created `<KibanaContextProvider>` component.

```jsx
import { KibanaContextProvider } from 'kibana-react';

<KibanaContextProvider services={{ ...core, ...plugins }}>
  <KibanaApplication />
</KibanaContextProvider>

<KibanaContextProvider services={{ notifications, overlays, embeddable }}>
  <KibanaApplication />
</KibanaContextProvider>
```

## Accessing context

Using `useKibana` hook.

```tsx
import { useKibana } from 'kibana-react';

const Demo = () => {
  const kibana = useKibana();
  return <div>{kibana.services.uiSettings.get('theme:darkMode') ? 'dark' : 'light'}</div>;
};
```

Using `withKibana()` higher order component.

```tsx
import { withKibana } from 'kibana-react';

const Demo = ({ kibana }) => {
  return <div>{kibana.services.uiSettings.get('theme:darkMode') ? 'dark' : 'light'}</div>;
};

export default withKibana(Demo);
```

Using `<UseKibana>` render prop.

```tsx
import { UseKibana } from 'kibana-react';

const Demo = () => {
  return (
    <UseKibana>
      {(kibana) => <div>{kibana.services.uiSettings.get('theme:darkMode') ? 'dark' : 'light'}</div>}
    </UseKibana>
  );
};
```

## `uiSettings` service

Wrappers around Core's `uiSettings` service.

### `useUiSetting` hook

`useUiSetting` synchronously returns the latest setting from `CoreStart['uiSettings']` service.

```tsx
import { useUiSetting } from 'kibana-react';

const Demo = () => {
  const darkMode = useUiSetting<boolean>('theme:darkMode');
  return <div>{darkMode ? 'dark' : 'light'}</div>;
};
```

#### Reference

```tsx
useUiSetting<T>(key: string, defaultValue: T): T;
```

### `useUiSetting$` hook

`useUiSetting$` synchronously returns the latest setting from `CoreStart['uiSettings']` service and
subscribes to changes, re-rendering your component with latest values.

```tsx
import { useUiSetting$ } from 'kibana-react';

const Demo = () => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');
  return <div>{darkMode ? 'dark' : 'light'}</div>;
};
```

#### Reference

```tsx
useUiSetting$<T>(key: string, defaultValue: T): [T, (newValue: T) => void];
```

## `overlays` service

Wrapper around Core's `overlays` service, allows you to display React modals and flyouts
directly without having to use `react-dom` library to mount to DOM nodes.

```tsx
import { createKibanaReactContext } from 'kibana-react';

class MyPlugin {
  start(core) {
    const {
      value: { overlays },
    } = createKibanaReactContext(core);

    overlays.openModal(<div>Hello world!</div>);
  }
}
```

- `overlays.openModal` &mdash; opens modal window.
- `overlays.openFlyout` &mdash; opens right side panel.

You can access `overlays` service through React context.

```tsx
const Demo = () => {
  const { overlays } = useKibana();
  useEffect(() => {
    overlays.openModal(<div>Oooops! {errorMessage}</div>);
  }, [errorMessage]);
};
```

## `notifications` service

Wrapper around Core's `notifications` service, allows you to render React elements
directly without having to use `react-dom` library to mount to DOM nodes.

```tsx
import { createKibanaReactContext } from 'kibana-react';

class MyPlugin {
  start(core) {
    const {
      value: { notifications },
    } = createKibanaReactContext(core);

    notifications.toasts.show({
      title: <div>Hello</div>,
      body: <div>world!</div>,
    });
  }
}
```

- `notifications.toasts.show()` &mdash; show generic toast message.
- `notifications.toasts.success()` &mdash; show positive toast message.
- `notifications.toasts.warning()` &mdash; show warning toast message.
- `notifications.toasts.danger()` &mdash; show error toast message.

You can access `notifications` service through React context.

```tsx
const Demo = () => {
  const { notifications } = useKibana();
  useEffect(() => {
    notifications.toasts.danger({
      title: 'Oooops!',
      body: errorMessage,
    });
  }, [errorMessage]);
};
```

## RedirectAppLinks

Utility component that will intercept click events on children anchor (`<a>`) elements to call
`application.navigateToUrl` with the link's href. This will trigger SPA friendly navigation
when the link points to a valid Kibana app.

```tsx
<RedirectAppLinks application={application}>
  <a href="/base-path/app/another-app/some-path">Go to another-app</a>
</RedirectAppLinks>
```
