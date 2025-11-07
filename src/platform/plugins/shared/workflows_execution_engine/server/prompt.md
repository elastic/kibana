In my project I need syntax to evaluate expressions in my YAML.
Currently we use LiquidJS to evaluate its output expression such, like this:
```liquid
{{steps.first.output.data.array | slice: 0,5 | slice: 0,3}}
```
But it has a lot of limitations. These are what we found:
- No possibility to use filters (pipes) within tags, like if,for,etc - see this issue https://github.com/harttle/liquidjs/issues/833
That means that the below syntax in liquid (where I have filter within if tag)
```liquid
{% if (strValue | size) > 10 %}
  <a href="{{person | prepend: "https://example.com/"}}">
    {{ person | capitalize }}
  </a>
{% endif %}
```
- Given the above limitation, it’s also not possible to use condition operations in value expressions where you expect to get true/false. The below does not work (fails on parsing phase):
```liquid
{{steps.first.output.data.array | slice: 0,5 | size == 1}} #expect to get true or false
```
- No parentheses support for condition expressions
- No ternary operator
… maybe something else

In the Workflow YAML we use it like that:
#### if condition
```yaml
 - name: if-liquid
    type: if
    condition: ${{steps.first.output.data.array contains 'Brad Pitt' and steps.first.output.data.booleanTrue}} # can't use filters within conditions. Too limited for condtions in general
    steps:
      - name: if-liquid-inner
        type: console
        with:
          message: "Done!"
```

#### Foreach
```yaml
  - name: foreach-liquid
    type: foreach
    foreach: '${{steps.first.output.data.array | slice: 0,5 | slice: 0,3}}'
    steps:
      - name: foreach-liquid-inner
        type: console
        with:
          message: "{{foreach.item}}"
```

Given all of the above, I consider the following packages to replace our workaround with LiquidJS expression evaluation:

## Expr_eval
NPM - https://www.npmjs.com/package/expr-eval
Github - https://github.com/silentmatt/expr-eval

Pros:
- Well JS like structured syntax
- Supports all needed boolean operators
- Ability to use transformation (via function calls) within conditions
- Ability to use parentheses to dictate operations priority
- Ternary operator
- Customizable
- Builds it's own AST and does not call JS eval


Cons:
- Looks differently comparing to LiquidJS expressions that might confuse users.
- Not sure about vulnerabilities


## Jexl
NPM - https://www.npmjs.com/package/jexl
Github - https://github.com/TomFrost/jexl

Pros:
- Well JS like structured syntax
- Supports all needed boolean operators (even supports defining custom ones)
- Ability to use transformation (via function calls) within conditions
- Transformation syntax similiar to LiquidJS filters
- Ability to use parentheses to dictate operations priority
- Ternary operator
- Customizable
- Builds it's own AST and does not call JS eval
- Has a lib to highlight Jexl syntax. See - https://www.npmjs.com/package/highlightjs-jexl

Cons:
- Not sure about vulnerabilities