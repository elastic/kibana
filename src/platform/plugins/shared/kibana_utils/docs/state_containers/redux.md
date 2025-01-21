# Redux

State containers similar to Redux stores but without the boilerplate.

State containers expose Redux-like API:

```js
container.getState()
container.dispatch()
container.replaceReducer()
container.subscribe()
container.addMiddleware()
```

State containers have a reducer and every time you execute a state transition it
actually dispatches an "action". For example, this

```js
container.transitions.increment(25);
```

is equivalent to

```js
container.dispatch({
  type: 'increment',
  args: [25],
});
```

Because all transitions happen through `.dispatch()` interface, you can add middleware&mdash;similar how you
would do with Redux&mdash;to monitor or intercept transitions.

For example, you can add `redux-logger` middleware to log in console all transitions happening with your store.

```js
import logger from 'redux-logger';

container.addMiddleware(logger);
```
