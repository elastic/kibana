# I18n Guideline

## All Localizers need to know

### Message types

The message ids chosen for message keys are descriptive of the string, and its role in the interface (button, label, header, etc.). Each message id ends with a descriptive type. Types are defined at the end of message id by combining to the last segment using camel case.

Ids should end with:

- Description (in most cases if it's `<p>` tag),
- Title (if it's `<h1>`, `<h2>`, etc. tags),
- Label (if it's `<label>` tag),
- ButtonLabel (if it's `<button>` tag),
- DropDownOptionLabel (if it'a an option),
- Placeholder (if it's a placeholder),
- Tooltip (if it's a tootltip),
- AriaLabel (if it's `aria-label` tag attribute),
- ErrorMessage (if it's an error message),
- LinkText (if it's `<a>` tag),
- ToggleSwitch and etc.
- `.markdown` (if it's markdown)

There is one more complex case, when we have to divide a single expression into different labels.

For example the message before translation looks like:

  ```html
  <p>
      The following deprecated languages are in use: {deprecatedLangsInUse.join(', ')}. Support for these languages will be removed in the next major version of Kibana and Elasticsearch. Convert your scripted fields to <EuiLink href={painlessDocLink}>Painless</EuiLink> to avoid any problems.
  </p>
  ```

This phrase contains a variable, which represents languages list, and a link (`Painless`). For such cases we divide the message into two parts: the main message, which contains placeholders, and additional message, which represents inner message.

It is used the following message id naming structure:
1) the main message id has the type on the penultimate position, thereby identifying a divided phrase, and the last segment ends with `Detail`.

```js
{
  'kbn.management.editIndexPattern.scripted.deprecationLangLabel.deprecationLangDetail': 'The following deprecated languages are in use: {deprecatedLangsInUse}. Support for these languages will be removed in the next major version of Kibana and Elasticsearch. Convert your scripted fields to {link} to avoid any problems.'
}
```

2) The inner message id has the type on the penultimate position and the name of the variable from the placeholder in the main message (in this case `link`) as the last segment that ends with own type.

For example:

```js
{
  'kbn.management.editIndexPattern.scripted.deprecationLangLabel.painlessLinkLabel': 'Painless'
}
```

### Attribute with variables interpolation

Messages can contain placeholders for embedding a value of a variable. For example:

```js
{
  'kbn.management.editIndexPattern.scripted.deleteFieldLabel': "Delete scripted field '{fieldName}'?"
  'kbn.management.editIndexPattern.scripted.noFieldLabel': "'{indexPatternTitle}' index pattern doesn't have a scripted field called '{fieldName}'"
}
```

Mostly such placeholders have meaningful name according to the content.

### Pluralization

I18n engine supports proper plural forms. It uses the [ICU Message syntax](http://userguide.icu-project.org/formatparse/messages) to define a message that has a plural label and works for all [CLDR languages](http://cldr.unicode.org/) which have pluralization rules defined. The numeric input is mapped to a plural category, some subset of "zero", "one", "two", "few", "many", and "other" depending on the locale and the type of plural.

For example:

```js
{
  'kbn.management.createIndexPattern.step.status.successLabel.strongIndicesLabel': '{indicesLength, plural, one {# index} other {# indices}}'
}
```

In case when `indicesLength` has value 1, the result string will be "`1 index`". In case when `indicesLength` has value 2 and more, the result string - "`2 indices`".

## Best practices

### Usage of appropriate component

#### In ReactJS

The long term plan is to rely on using `FormattedMessage` and `i18n.translate()` by statically importing `i18n` from the `@kbn/i18n` package. **Avoid using `injectI18n` and use `i18n.translate()` instead.**

- You should use `<FormattedMessage>` most of the time.
- In the case where the string is expected (`aria-label`, `placeholder`), Call JS function `i18n.translate()` from the`@kbn/i18n` package.

Currently, we support the following ReactJS `i18n` tools, but they will be removed in future releases:
- Usage of `props.intl.formatmessage()` (where `intl` is  passed to `props` by `injectI18n` HOC).

#### In JavaScript

- Use `i18n.translate()` in NodeJS or any other framework agnostic code, where `i18n` is the I18n engine from `@kbn/i18n` package.

### Naming convention

The message ids chosen for message keys should always be descriptive of the string, and its role in the interface (button label, title, etc.). Think of them as long variable names. When you have to change a message id, adding a progressive number to the existing key should always be used as a last resort.
Here's a rule of id naming:

`{plugin}.{area}.[{sub-area}].{element}`

- Message id should start with namespace that identifies a functional area of the app (`common.ui` or `common.server`) or a plugin (`kbn`, `vega`, etc.).

    For example:

  ```js
  'kbn.management.createIndexPattern.stepTime.options.patternHeader'
  'common.ui.indexPattern.warningLabel'
  ```

- Use camelCase for naming segments, comprising several words.

- Each message id should end with a type. For example:

  ```js
  'kbn.management.editIndexPattern.createIndexButtonLabel'
  'kbn.management.editIndexPattern.mappingConflictTitle'
  'kbn.management.editIndexPattern.mappingConflictLabel'
  'kbn.management.editIndexPattern.fields.filterAriaLabel'
  'kbn.management.editIndexPattern.fields.filterPlaceholder'
  'kbn.management.editIndexPattern.refreshTooltip'
  'kbn.management.editIndexPattern.fields.allTypesDropDown'
  'kbn.management.createIndexPattern.includeSystemIndicesToggleSwitch'
  'kbn.management.editIndexPattern.wrongTypeErrorMessage'
  'kbn.management.editIndexPattern.scripted.table.nameDescription'
  'xpack.lens.formulaDocumentation.filterRatioDescription.markdown'
  ```

- For complex messages, which are divided into several parts, use the following approach:
  - the main message id should have the type on the penultimate position, thereby identifying a divided phrase, and the last segment should end with `Detail`,
  - the inner message id should have the type on the penultimate position and the name of the variable from the placeholder in the main message as the last segment that ends with its own type.

  For example, before the translation there was a message:

  ```js
  <strong>Success!</strong>
  Your index pattern matches <strong>{exactMatchedIndices.length} {exactMatchedIndices.length === 1 ? 'index' : 'indices'}</strong>.
  ```

  After translation we get the following structure:

  ```js
  <FormattedMessage
    id="kbn.management.createIndexPattern.step.status.successLabel.successDetail"
    defaultMessage="{strongSuccess} Your index pattern matches {strongIndices}."
    values={{
      strongSuccess: (
        <strong>
          <FormattedMessage
            id="kbn.management.createIndexPattern.step.status.successLabel.strongSuccessLabel"
            defaultMessage="Success!"
          />
        </strong>),
      strongIndices: (
        <strong>
          <FormattedMessage
            id="kbn.management.createIndexPattern.step.status.successLabel.strongIndicesLabel"
            defaultMessage="{indicesLength, plural, one {# index} other {# indices}}"
            values={{ indicesLength: exactMatchedIndices.length }}
          />
        </strong>)
    }}
  />
  ```

### Defining type for message

Each message id should end with a type of the message.

| type | example message id |
| --- | --- |
| header | `kbn.management.createIndexPatternTitle` |
| label | `kbn.management.createIndexPatternLabel ` |
| button | `kbn.management.editIndexPattern.scripted.addFieldButtonLabel` |
| drop down | `kbn.management.editIndexPattern.fields.allTypesDropDown` |
| placeholder | `kbn.management.createIndexPattern.stepTime.options.patternPlaceholder` |
| `aria-label` attribute | `kbn.management.editIndexPattern.removeAriaLabel` |
| tooltip | `kbn.management.editIndexPattern.removeTooltip` |
| error message | `kbn.management.createIndexPattern.step.invalidCharactersErrorMessage` |
| toggleSwitch | `kbn.management.createIndexPattern.includeSystemIndicesToggleSwitch` |
| markdown | `xpack.lens.formulaDocumentation.filterRatioDescription.markdown` |

For example:

- for header:

  ```js
  <h1>
      <FormattedMessage
        id="kbn.management.createIndexPatternTitle"
        defaultMessage="Create index pattern"
      />
  </h1>
  ```

- for label:

  ```js
  <EuiTextColor color="subdued">
      <FormattedMessage
        id="kbn.management.createIndexPatternLabel"
        defaultMessage="Kibana uses index patterns to retrieve data from Elasticsearch indices for things like visualizations."
      />
  </EuiTextColor>
  ```

- for button:

  ```js
  <EuiButton data-test-subj="addScriptedFieldLink" href={addScriptedFieldUrl}>
       <FormattedMessage id="kbn.management.editIndexPattern.scripted.addFieldButtonLabel" defaultMessage="Add scripted field"/>
  </EuiButton>
  ```

- for dropDown:

  ```js
    <option value={
      i18n.translate('kbn.management.editIndexPattern.fields.allTypesDropDown', {
        defaultMessage: 'All field types',
      })
    }
  ```

- for placeholder:

  ```js
  <EuiFieldText
      name="indexPatternId"
      placeholder={intl.formatMessage({
        id: 'kbn.management.createIndexPattern.stepTime.options.patternPlaceholder',
        defaultMessage: 'custom-index-pattern-id' })}
  />
  ```

- for `aria-label` attribute and tooltip

  ```js
  <button
      aria-label="{{ ::'kbn.management.editIndexPattern.removeAriaLabel' | i18n: {defaultMessage: 'Remove index pattern'} }}"
      tooltip="{{ ::'kbn.management.editIndexPattern.removeTooltip' | i18n: {defaultMessage: 'Remove index pattern'} }}"
      >
  </button>
  ```

- for errorMessage:

  ```js
  errors.push(
      intl.formatMessage(
              {
                  id: 'kbn.management.createIndexPattern.step.invalidCharactersErrorMessage',
                  defaultMessage: 'An index pattern cannot contain spaces or the characters: {characterList}'
              },
              { characterList }
      ));
  ```

- for toggleSwitch

  ```js
  <EuiSwitch
      label={<FormattedMessage
        id="kbn.management.createIndexPattern.includeSystemIndicesToggleSwitch"
        defaultMessage="Include system indices"
      />}
  />
  ```

- for markdown
  ```js
  import { Markdown } from '@elastic/eui';
  
  <Markdown
      markdown={
        i18n.translate('xpack.lens.formulaDocumentation.filterRatioDescription.markdown', {
        defaultMessage: `### Filter ratio:
        
          Use \`kql=''\` to filter one set of documents and compare it to other documents within the same grouping.
          For example, to see how the error rate changes over time:
          
          \`\`\`
          count(kql='response.status_code > 400') / count()
          \`\`\`
        `,
        })
      }
  />
  ```

### Variety of `values`

- Variables

  ```html
  <FormattedMessage
    id="kbn.management.createIndexPatternHeader"
    defaultMessage="Create {indexPatternName}"
    values={{
      indexPatternName
    }}
  />
  ```

- Labels and variables in tag

  ```html
  <FormattedMessage
    id="kbn.management.createIndexPattern.step.indexPattern.disallowLabel"
    defaultMessage="You can't use spaces or the characters {characterList}."
    values={{ characterList: <strong>{characterList}</strong> }}
  />
  ```

  ```html
  <FormattedMessage
    id="kbn.management.settings.form.noSearchResultText"
    defaultMessage="No settings found {clearSearch}"
    values={{
      clearSearch: (
        <EuiLink onClick={clearQuery}>
          <FormattedMessage
            id="kbn.management.settings.form.clearNoSearchResultText"
            defaultMessage="(clear search)"
          />
        </EuiLink>
      ),
    }}
  />
  ```

- Non-translatable text such as property name.

  ```html
  <FormattedMessage
    id="xpack.security.management.users.editUser.changePasswordUpdateKibanaTitle"
    defaultMessage="After you change the password for the kibana user, you must update the {kibana}
    file and restart Kibana."
    values={{ kibana: 'kibana.yml' }}
  />
  ```

### Text with plurals

The numeric input is mapped to a plural category, some subset of "zero", "one", "two", "few", "many", and "other" depending on the locale and the type of plural. There are languages with multiple plural forms [Language Plural Rules](http://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html).

Here is an example of message translation depending on a plural category:

```jsx
  <FormattedMessage
    id="kbn.management.editIndexPattern.mappingConflictLabel"
    defaultMessage="{conflictFieldsLength, plural, one {A field is} other {# fields are}} defined as several types (string, integer, etc) across the indices that match this pattern."
    values={{ conflictFieldsLength: conflictFields.length }}
  />
```

When `conflictFieldsLength` equals 1, the result string will be `"A field is defined as several types (string, integer, etc) across the indices that match this pattern."`. In cases when `conflictFieldsLength` has value of 2 or more, the result string - `"2 fields are defined as several types (string, integer, etc) across the indices that match this pattern."`.

### Text with markdown

There is some support for using markdown and you can use any of the following syntax:

#### Headers

```md
# This is an <h1> tag
## This is an <h2> tag
###### This is an <h6> tag
```

#### Emphasis

```md
*This text will be italic*
_This will also be italic_

**This text will be bold**
__This will also be bold__

_You **can** combine them_
```

#### Lists
  ##### Unordered

```md
* Item 1
* Item 2
  * Item 2a
  * Item 2b
```
  ##### Ordered

```md
1. Item 1
1. Item 2
1. Item 3
  1. Item 3a
  1. Item 3b
```
#### Images

```md
![Github Logo](/images/logo.png)
Format: ![Alt Text](url)
```
  
#### Links

```md
http://github.com - automatic!
[GitHub](http://github.com)
```
  
#### Blockquotes

```md
As Kanye West said:

> We're living the future so
> the present is our past.
```
#### Code Blocks

```md
var a = 13;
```

#### Inline code

```md
I think you should use an
`<addr>` element here instead
```
### Splitting

Splitting sentences into several keys often inadvertently presumes a grammar, a sentence structure, and such composite strings are often very difficult to translate.

- Do not divide a single sentence into different labels unless you have absolutely no other choice.
- Do not divide sentences that belong together into separate labels.

  For example:

  `The following dialogue box indicates progress. You can close it and the process will continue to run in the background.`

  If this group of sentences is separated it’s possible that the context of the `'it'` in `'close it'` will be lost.

### Large paragraphs

Try to avoid using large paragraphs of text. They are difficult to maintain and often need small changes when the information becomes out of date.

If you have no other choice, you can split paragraphs into a _few_ i18n chunks. Chunks should be split at logical points to ensure they contain enough context to be intelligible on their own.

### Unit tests

#### How to test `FormattedMessage` and `i18n.translate()` components. 

To make `FormattedMessage` component work properly, wrapping it with `I18nProvider` is required. In development/production app, this is done in the ancestor components and developers don't have to worry about that. 

But when unit-testing them, no other component provides that wrapping. That's why `shallowWithI18nProvider` and `mountWithI18nProvider` helpers are created. 

For example, there is a component that has `FormattedMessage` inside, like `SaveModal` component:

```js
// ...
export const SaveModal = (props) => {
  return (
    <div>
      {/* Other things. */}
      <EuiButton>
        <FormattedMessage
          id="kbn.dashboard.topNav.saveModal.saveButtonText"
          defaultMessage="Save"
        />
      </EuiButton>
      {/* More other things. */}
    </div>
  )
}
```

To test `SaveModal` component, it should be wrapped with `I18nProvider` by using `shallowWithI18nProvider`: 

```js
// ...
it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <SaveModal dashboard={{}}/>
    );

    expect(component).toMatchSnapshot();
});
// ...
```

If a component uses only `i18n.translate()`, it doesn't need `I18nProvider`. In that case, you can test them with `shallow` and `mount` functions that `enzyme` providers out of the box. 

#### How to test `injectI18n` HOC components. 

Testing React component that uses the `injectI18n` higher-order component is more complicated because `injectI18n()` creates a wrapper component around the original component.

With shallow rendering only top level component is rendered, that is a wrapper itself, not the original component. Since we want to test the rendering of the original component, we need to access it via the wrapper's `WrappedComponent` property. Its value will be the component we passed into `injectI18n()`.

When testing such component, use the `shallowWithIntl` helper function defined in `@kbn/test-jest-helpers` and pass the component's `WrappedComponent` property to render the wrapped component. This will shallow render the component with Enzyme and inject the necessary context and props to use the `intl` mock defined in `test_utils/mocks/intl`.

Use the `mountWithIntl` helper function to mount render the component.

For example, there is a component that is wrapped by `injectI18n`, like in the `AddFilter` component:

```js
// ...
export const AddFilter = injectI18n(
  class AddFilterUi extends Component {
  // ...
    render() {
      const { filter } = this.state;
      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={10}>
            <EuiFieldText
              fullWidth
              value={filter}
              onChange={e => this.setState({ filter: e.target.value.trim() })}
              placeholder={this.props.intl.formatMessage({
                id: 'kbn.management.indexPattern.edit.source.placeholder',
                defaultMessage: 'source filter, accepts wildcards (e.g., `user*` to filter fields starting with \'user\')'
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  }
);
```

To test the `AddFilter` component it is needed to render its `WrappedComponent` property using `shallowWithIntl` function to pass `intl` object into the `props`.

```js
// ...
it('should render normally', async () => {
    const component = shallowWithIntl(
      <AddFilter.WrappedComponent onAddFilter={() => {}}/>
    );

    expect(component).toMatchSnapshot();
});
// ...
```

## Development steps

1. Localize label with the suitable i18n component.

2. Make sure that UI still looks correct and is functioning properly (e.g. click handler is processed, checkbox is checked/unchecked, etc.).

3. Check functionality of an element (button is clicked, checkbox is checked/unchecked, etc.).

4. Run i18n validation/extraction tools and skim through created `en.json`:
    ```bash
    $ node scripts/i18n_check --ignore-missing
    $ node scripts/i18n_extract --output-dir ./
    ```

5. Run linters and type checker as you normally do.

6. Run tests.

7. Run Kibana with enabled pseudo-locale (either pass `--i18n.locale=en-xa` as a command-line argument or add it to the `kibana.yml`) and observe the text you've just localized.

    If you did everything correctly, it should turn into something like this `Ĥéļļļô ŴŴôŕļļð!` assuming your text was `Hello World!`.

8. Check that CI is green.
