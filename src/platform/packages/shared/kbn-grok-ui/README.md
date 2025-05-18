# @kbn/grok-ui


- Tools for parsing / converting Grok expressions (into Oniguruma / JS Regex).
- UI components for working with Grok expressions.

# NOTE

The UI for this is still in the work in progress phase. UI / UX will be refined.

## Usage

You can either use the parsing / conversion tools standalone, or use the UI component which wraps the tools. The UI component offers all of the definitions [defined in the ES repo](https://github.com/elastic/elasticsearch/tree/main/libs/grok/src/main/resources/patterns/ecs-v1).


## Tools

First you need a `GrokCollection` which will hold your pattern definitions:

`const collection = new GrokCollection();`

Then you can add your definitions:

```ts
Object.entries(PATTERN_MAP).forEach(([key, value]) => {
    collection.addPattern(key, String.raw`${value}`);
});
```

Once they're added, resolve your patterns. This converts the pattern placeholders into their matching Oniguruma based on the definitions.

`collection.resolvePatterns();`

Now we can create a `DraftGrokExpression`. This instance can have it's expression changed on the fly to test different samples / expressions, this instance will be passed the collection you created with the pattern definitions.

`const draftGrokExpression = new DraftGrokExpression(collection);`

Once you have an expression you're interested in, you can call:

```ts
draftGrokExpression.updateExpression(
    String.raw`^\"(?<rid>[^\"]+)\" \| %{IPORHOST:clientip} (?:-|%{IPORHOST:forwardedfor}) (?:-|%{USER:ident}) (?:-|%{USER:auth}) \[%{HTTPDATE:timestamp}\] \"(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:httpversion})?|-)\" %{NUMBER:response:int} (?:-|%{NUMBER:bytes})`
);
```

At this point you can grab a Regular Expression instance to use (this will have converted Oniguruma to a native JS Regex):

`const regexp = draftGrokExpression.getRegex();`

If you'd just like the raw regex pattern represented as a string you can call:

`const regexpPattern = draftGrokExpression.getRegexPattern()`

Or you can just call `parse()` to get structured output directly:

```ts
const parsed = draftGrokExpression.parse([
    `"uRzbUwp5eZgAAAAaqIAAAAAa" | 5.3.2.1 - - - [24/Feb/2013:13:40:51 +0100] "GET /cpc HTTP/1.1" 302 -`,
    `"URzbTwp5eZgAAAAWlbUAAAAV" | 4.3.2.7 - - - [14/Feb/2013:13:40:47 +0100] "GET /cpc/finish.do?cd=true&mea_d=0&targetPage=%2Fcpc%2F HTTP/1.1" 200 5264`,
    `"URzbUwp5eZgAAAAaqIEAAAAa" | 4.3.2.1 - - - [14/Feb/2013:13:40:51 +0100] "GET /cpc/ HTTP/1.1" 402 -`,
    `"URzbUwp5eZgAAAAWlbYAAAAV" | 4.3.2.1 - - - [14/Feb/2013:13:40:51 +0100] "POST /cpc/ HTTP/1.1" 305 - `,
]);
```

## UI component 

This component is built on top of the same tools.

```tsx
const GrokEditorExample = () => {
  const [samples, setSamples] = useState('');
  const [expression, setExpression] = useState('');

  return (
    <GrokEditor
      samples={samples}
      onChangeSamples={setSamples}
      expression={expression}
      onChangeExpression={setExpression}
      onChangeOutput={(output) => console.log(output)}
    />
  );
};
```