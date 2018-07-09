# I18n Guideline

## All Localizers need to know

### Message types

The IDs (names) for messages are descriptive of the string, and its role in the interface (button, label, header, etc.). Each message id ends with a descriptive type.

The following types are supported:
- header
- label
- button
- dropDown
- placeholder
- tooltip
- aria
- errorMessage
- toggleSwitch

There is one more complex case, when we have to divide a single expression into different labels. 

For example the message before translation looks like:

  ```js
  <p>
      The following deprecated languages are in use: {deprecatedLangsInUse.join(', ')}. Support for these languages will be removed in the next major version of Kibana and Elasticsearch. Convert you scripted fields to <EuiLink href={painlessDocLink}>Painless</EuiLink> to avoid any problems.
  </p>
  ```

This phrase contains a variable, which represents languages list, and a link (``Painless``). For such cases we divide the message into two parts: the main message, which contains placeholders, and additioanl message, which represents inner meesage.

It is used the following id naming structure:
1) the main message id has the type on the second-to-last position, thereby identifying a divided phrase, and the last segment named  ``detail``.
```js
“kbn.management.indexPattern.edit.scripted.deprecationLang.label.detail”: "The following deprecated languages are in use: {deprecatedLangsInUse}. Support for these languages will be removed in the next major version of Kibana and Elasticsearch. Convert you scripted fields to {link} to avoid any problems."
```
2) The inner message id has the type on the second-to-last position and the name of the variable from the placeholder in the main message (in this case ``link``) as the last segment.
```js

“kbn.management.indexPattern.edit.scripted.deprecationLang.label.link”: "Painless"
```

### Attribute with variables interpolation

Messages can contain placeholders for embedding a value of a variable. For example:
```js
“kbn.management.indexPattern.edit.scripted.deleteField.label“: "Delete scripted field '{fieldName}'?"
“kbn.management.indexPattern.edit.scripted.noField.label“: "'{indexPatternTitle}' index pattern doesn't have a scripted field called '{fieldName}'"
```
Mostly such placeholders have meaningful name according to the сontent.

### Pluralization

I18n engine supports proper plural forms. It uses the [ICU Message syntax](http://userguide.icu-project.org/formatparse/messages) to define a message that has a plural label and and works for all [CLDR languages](http://cldr.unicode.org/) which have pluralization rules defined. The numeric input is mapped to a plural category, some subset of "zero", "one", "two", "few", "many", and "other" depending on the locale and the type of plural.

For example:
```js
“kbn.management.indexPattern.create.step.status.success.label.strongIndices“: "{indicesLength, plural, one {# index} other {# indices}}"
```

## Best practices


### Naming conversation

- Message id should start with namespace. 

    For example:

  ```js
  “kbn.management.indexPattern.create.stepTime.options.pattern.header“
  “common.ui.indexPattern.create.warning.label“
  ```

- Use camelCase for naming segments, comprising several words.

- Each message id should end with a type. For example:

  ```js
  “kbn.management.indexPattern.edit.createIndex.button”
  “kbn.management.indexPattern.edit.mappingConflict.header”
  “kbn.management.indexPattern.edit.mappingConflict.label”
  “kbn.management.indexPattern.edit.fields.filter.aria”
  “kbn.management.indexPattern.edit.fields.filter.placeholder”
  “kbn.management.indexPattern.edit.refresh.tooltip”
  “kbn.management.indexPattern.edit.fields.allTypes.dropDown”
  “kbn.management.indexPattern.create.includeSystemIndices.toggleSwitch”
  “kbn.management.indexPattern.edit.wrongType.errorMessage”
  “kbn.management.indexPattern.edit.scripted.table.name.description”
  ```

- For complex messagges, that is divided into several parts, use the folllowing approach:
  - the main message id should have the type on the second-to-last position, thereby identifying a divided phrase, and the last segment should be named ``detail``,
  - the inner message id should have the type on the second-to-last position and the name of the variable from the placeholder in the main message as the last segment.

  For example before the translation there was a message:
  ```js
  <strong>Success!</strong>
  Your index pattern matches <strong>{exactMatchedIndices.length} {exactMatchedIndices.length > 1 ? 'indices' : 'index'}</strong>.
  ```

  After translation:
  ```js
  <FormattedMessage
    id="kbn.management.indexPattern.create.step.status.success.label.detail"
    defaultMessage="{strongSuccess} Your index pattern matches {strongIndices}."
    values={{
      strongSuccess: (
        <strong>
          <FormattedMessage
            id="kbn.management.indexPattern.create.step.status.success.label.strongSuccess"
            defaultMessage="Success!"
          />
        </strong>),
      strongIndices: (
        <strong>
          <FormattedMessage
            id="kbn.management.indexPattern.create.step.status.success.label.strongIndices"
            defaultMessage="{indicesLength, plural, one {# index} other {# indices}}"
            values={{ indicesLength: exactMatchedIndices.length }}
          />
        </strong>)
    }}
  />
  ```


### Define type for message

Each message id should end with a type of the message. For example:

- for header:

  ```js
  <h1>
      <FormattedMessage
        id="kbn.management.indexPattern.create.header"
        defaultMessage="Create index pattern"
      />
  </h1>
  ```

- for label:

  ```js
  <EuiTextColor color="subdued">
      <FormattedMessage
        id="kbn.management.indexPattern.create.label"
        defaultMessage="Kibana uses index patterns to retrieve data from Elasticsearch indices for things like visualizations."
      />
  </EuiTextColor>
  ```

- for button:

  ```js

  <EuiButton data-test-subj="addScriptedFieldLink" href={addScriptedFieldUrl}>
       <FormattedMessage id="kbn.management.indexPattern.edit.scripted.addField.button" defaultMessage="Add scripted field"/>
  </EuiButton>
  ```

- for dropDown:

  ```js
  <select ng-model="indexedFieldTypeFilter" ng-options="o for o in indexedFieldTypes">
      <option value=""
          i18n-id="kbn.management.indexPattern.edit.fields.allTypes.dropDown"
          i18n-default-message="All field types"></option>
  </select>
  ```

- for placeholder:

  ```js
  <EuiFieldText
      name="indexPatternId"
      placeholder={intl.formatMessage({
        id: 'kbn.management.indexPattern.create.stepTime.options.pattern.placeholder',
        defaultMessage: 'custom-index-pattern-id' })}
  />
  ```

- for `aria-label` attribute and tooltip

  ```js
  <button
      aria-label="{{'kbn.management.indexPattern.edit.remove.aria' | i18n: {defaultMessage: 'Remove index pattern'} }}"
      tooltip="{{'kbn.management.indexPattern.edit.remove.tooltip' | i18n: {defaultMessage: 'Remove index pattern'} }}"
      >
  </button>
  ```

- for errorMessage:

  ```js
  errors.push(
      intl.formatMessage(
              {
                  id: 'kbn.management.indexPattern.create.step.invalidCharacters.errorMessage',
                  defaultMessage: 'An index pattern cannot contain spaces or the characters: {characterList}'
              },
              { characterList }
      ));
  ```

- for toggleSwitch

  ```js
  <EuiSwitch
      label={<FormattedMessage
        id="kbn.management.indexPattern.create.includeSystemIndices.toggleSwitch"
        defaultMessage="Include system indices"
      />}
  />
  ```


### Text with plurals

The numeric input is mapped to a plural category, some subset of "zero", "one", "two", "few", "many", and "other" depending on the locale and the type of plural. There are languages with multiple plural forms [Language Plural Rules](http://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html).

```js
<FormattedMessage
    id="kbn.management.indexPattern.create.step.status.matchAny.label.strongIndices"
    defaultMessage="{allIndicesLength, plural, one {# index} other {# indices}}"
    values={{ allIndicesLength: allIndices.length }}
/>
```

### Unit tests

Additional adjustments in unit tests are needed only for those components where `I18nContext` component is used. Due to `I18nContext` is implemented using render callback, it is required additional step to render the component's child. You need to pass the `I18nContext` component to `shallowWithIntl` function from `'test_utils/enzyme_helpers'`.

For example, there is a component in which `I18nContext` is used, like in the `AddFilter` component:

```js
...
render(
    <I18nContext>
        {intl => (
          <EuiFieldText
                fullWidth
                value={filter}
                onChange={e => this.setState({ filter: e.target.value.trim() })}
                placeholder={intl.formatMessage({
                  id: 'kbn.management.indexPattern.edit.source.placeholder',
                  defaultMessage: 'source filter, accepts wildcards (e.g., `user*` to filter fields starting with \'user\')' })}
            />
        )}
      </I18nContext>
)
...
```

To test the component it is needed to render it using `shallow` and separately render `I18nContext` component using `shallowWithIntl` function to pass `intl` object into the context.

```js
...
it('should ignore strings with just spaces', async () => {
    const wrapper = shallow(
      <AddFilter onAddFilter={() => {}}/>
    );

    const component = shallowWithIntl(wrapper.find('I18nContext'));
    component.find('EuiFieldText').simulate('keypress', ' ');
    component.update();

    expect(component).toMatchSnapshot();
});
...
```

