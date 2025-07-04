# @kbn/grok-ui


- Tools for parsing / converting Grok expressions (into Oniguruma / JS Regex).
- UI components for working with Grok expressions.


## Usage

You can either use the parsing / conversion tools standalone, or use the UI components which wraps the tools. 

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

This update is also emitted via an Observable.

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

## UI components

The UI components make no assumptions about state libraries etc, they simply require the use of `DraftGrokExpression` model instances.

### Expression

This component can be used to write Grok expressions.

E.g.:

```tsx
<Expression
  draftGrokExpression={draftGrokExpression}
  grokCollection={grokCollection}
/>
```

### Read only sample

This component applies highlights and tooltips (if any) from the Grok pattern to a single sample. This component can play nicely with things like Data Grid's cell rendering. It's more performant as it doesn't have a Monaco instance backing it.

```tsx
<Sample
  grokCollection={grokCollection}
  draftGrokExpressions={grokExpressions}
  sample="a string you would like processed and highlighted"
/>
```

### Sample, input version

This component applies highlights and tooltips (if any) from the Grok pattern to multiple samples (one per line). This component is backed by a Monaco instance, so care should be taken with how many of these instances are rendered. This is useful when you need the user to be able to change the sample on the fly / in a "live" fashion.


```tsx
<SampleInput
  grokCollection={grokCollection}
  draftGrokExpressions={grokExpressions}
  sample={sample}
  onChangeSample={setSample}
/>
```

`draftGrokExpressions` expects an array as, following the way Grok works, each pattern will be tested until the first (if any) successful pattern is found.