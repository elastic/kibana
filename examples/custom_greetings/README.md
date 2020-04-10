## Custom Greetings

This plugin is an example of adding custom implementations to a registry supplied by another plugin.

It follows the best practice of also emitting direct accessors to these implementations on this
plugin's start contract.

This
```ts
  const casualGreeter = customGreetings.getCasualGreeter();
```

should be preferred to

```ts
  const casualGreeter = greeting.getGreeter('CASUAL_GREETER');
```

becuase:
 - the accessing plugin doesn't need to handle the possibility of `casualGreeter` being undefined
 - it's more obvious that the plugin accessing this greeter should list `customGreetings` as a plugin dependency
 - if the specific implementation had a specialized type, it can be accessed this way, in lieu of supporting
  typescript generics on the generic getter (e.g. `greeting.getGreeter<T>(id)`), which is error prone.