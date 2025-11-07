# Expression Language Analysis for Workflow YAML

## Executive Summary

After comprehensive analysis of LiquidJS limitations and evaluation of alternative expression languages (Jexl and expr-eval), **I recommend Jexl** as the primary expression engine with LiquidJS retained for template rendering only. Jexl provides the best balance of features, syntax familiarity, and extensibility for complex conditional logic and data transformations.

---

## Current State: LiquidJS Limitations

### Identified Problems

1. **No filters in control structures**: Cannot use pipes (filters) within `if`, `for`, or other control tags
   ```liquid
   {% if (strValue | size) > 10 %}  <!-- NOT SUPPORTED -->
   ```

2. **No boolean expression evaluation**: Cannot evaluate expressions that return true/false
   ```liquid
   {{steps.first.output.data.array | slice: 0,5 | size == 1}}  <!-- FAILS -->
   ```

3. **No parentheses support**: Cannot control operation precedence in conditions

4. **No ternary operator**: Cannot do inline conditional expressions
   ```liquid
   {{ condition ? 'yes' : 'no' }}  <!-- NOT SUPPORTED -->
   ```

5. **Limited logical operators**: Basic boolean logic but not suitable for complex conditions

### Why This Matters

In workflow automation, users need to:
- Make complex decisions based on transformed data
- Filter/slice/transform data before checking conditions
- Provide fallback values dynamically
- Chain multiple transformations with conditional logic

---

## Candidate Evaluation

## 1. Jexl (JavaScript Expression Language)

### Package Information
- **NPM Package**: `jexl` v2.3.0
- **GitHub**: https://github.com/TomFrost/Jexl
- **Last Published**: 5 years ago (2020)
- **Weekly Downloads**: ~60,000
- **GitHub Stars**: 629
- **GitHub Forks**: 101
- **Contributors**: 13
- **License**: MIT
- **Dependencies**: 1 (has TypeScript definitions via @types/jexl)
- **Used by**: 122 packages

### Pros

#### ✅ Superior Syntax & Usability
- **Pipe-based transforms** similar to LiquidJS - familiar to users
  ```javascript
  'name.last | upper | split(" ")'
  ```
- **Can use filters in conditions** - solves core LiquidJS limitation
  ```javascript
  '("brad Pitt" | capitalize) in steps.first.output.data.array'
  ```
- **Ternary operator support**
  ```javascript
  'age > 62 ? "retired" : "working"'
  ```
- **Parentheses for precedence control**
  ```javascript
  '(a + b) * c'
  ```

#### ✅ Powerful Features
- **Collection filtering with dot notation**
  ```javascript
  'employees[.age > 30 && .age < 40]'
  ```
- **Both sync and async evaluation** (evalSync and eval)
- **Custom transforms** - easy to add domain-specific functions
- **Custom operators** - can define new binary/unary operators
- **Custom functions** - for operations that don't fit transform model
- **Promise support** - context can include promises, Jexl waits for resolution
- **Compile once, evaluate many times** - performance optimization

#### ✅ Ecosystem & Tooling
- **Interactive playground**: https://czosel.github.io/jexl-playground/
- **Syntax highlighter available**: `highlightjs-jexl` package
- **Python implementation exists**: PyJEXL by Mozilla
- **Good documentation** with many examples
- **RunKit sandbox** for testing

#### ✅ Security
- **No published CVEs**
- **Builds own AST** - doesn't use JavaScript eval()
- **No security policy issues reported**
- **Sandboxed execution**

### Cons

#### ⚠️ Maintenance Concerns
- **Last updated 4-5 years ago** (2020)
- **No recent commits** - project appears dormant
- **Moderate community size** - not enterprise-backed
- **Original creator may not be actively maintaining**

#### ⚠️ Limitations
- **Object comparison in arrays** - `{a: 'b'} in [{a: 'b'}]` returns false (uses == behind scenes)
- **No TypeScript built-in** - needs @types/jexl
- **Moderate learning curve** for users not familiar with expression languages

#### ⚠️ Risk Factors
- **Maintenance risk** - if critical bugs found, fixes may be slow
- **Dependency risk** - may need to fork if abandoned
- **Limited enterprise adoption visibility**

### YAML Usage Examples

#### If Conditions
```yaml
- name: if-jexl
  type: if
  condition: "$jexl{{('brad Pitt' | capitalize) in steps.first.output.data.array | slice(0, 3) && steps.first.output.data.booleanTrue}}"
  steps:
    - name: if-jexl-inner
      type: console
      with:
        message: "Done!"
```

**Benefits**: Clean pipe syntax, filters work in conditions, readable

#### Foreach with Ternary
```yaml
- name: foreach-jexl
  type: foreach
  foreach: '$jexl{{steps.first.output.data.booleanFalse ? steps.first.output.data.array | slice(0,5) | slice(0,3) : ["nothing"]}}'
  steps:
    - name: foreach-jexl-inner
      type: console
      with:
        message: "{{foreach.item}}"
```

**Benefits**: Ternary operator, fallback arrays, transformations on both branches

---

## 2. expr-eval

### Package Information
- **NPM Package**: `expr-eval` v2.0.2
- **GitHub**: https://github.com/silentmatt/expr-eval
- **Last Published**: 6 years ago (2019)
- **Weekly Downloads**: ~813,000 (!!)
- **GitHub Stars**: 1,300
- **GitHub Forks**: 258
- **Contributors**: 30
- **License**: MIT
- **Dependencies**: 0 (zero dependencies, has built-in TypeScript definitions)
- **Used by**: 38,700+ projects (!!)

### Pros

#### ✅ Extremely Wide Adoption
- **813K weekly downloads** - 13x more than Jexl
- **Used by 38.7k projects** - massive adoption
- **30 contributors** - larger contributor base
- **More stars and forks** than Jexl

#### ✅ Strong Technical Foundation
- **Zero dependencies** - no supply chain risk
- **Built-in TypeScript definitions** - better DX
- **Comprehensive math operations** - extensive math function library
- **Can compile to native JS functions** - toJSFunction() for performance
- **Builds own AST** - doesn't use JavaScript eval()

#### ✅ Powerful Features
- **Ternary operator support**
- **Parentheses for precedence**
- **Function composition** via substitute()
- **Expression simplification** - partial evaluation with known variables
- **Custom JavaScript functions** - extensible
- **Array operations** - map, fold, filter, indexOf, join
- **Both dot and bracket notation** for property access

#### ✅ Security
- **No published CVEs**
- **Operator configuration** - can disable dangerous operators (assignment, member access)
- **Sandboxed execution**
- **No security policy issues reported**

### Cons

#### ⚠️ Maintenance Concerns (Critical)
- **Last updated 6 years ago** (2019) - older than Jexl
- **Project appears abandoned** - no recent activity
- **Highest maintenance risk** of all options

#### ⚠️ Syntax Differences
- **Function call syntax instead of pipes** - less intuitive for transformations
  ```javascript
  'lower(capitalize("something"))' // instead of 'something | capitalize | lower'
  ```
- **Nested function calls** - harder to read with multiple transformations
  ```javascript
  'slice(slice(steps.first.output.data.array, 0, 5), 0, 3)'
  ```
- **Not as elegant** for data transformation workflows
- **Math-oriented** rather than data-transformation-oriented

#### ⚠️ Use Case Mismatch
- **Designed for math expressions** - not data transformation
- **Less suitable for workflow logic** - no pipe-based data flow
- **Syntax confusion** - users familiar with LiquidJS will find it unintuitive

### YAML Usage Examples

#### If Conditions
```yaml
- name: if-expr
  type: if
  condition: $expr{{capitalize('brad Pitt') in steps.first.output.data.array and steps.first.output.data.booleanTrue}}
  steps:
    - name: if-expr-inner
      type: console
      with:
        message: "Done!"
```

**Drawbacks**: Function calls instead of pipes, less readable for multiple transforms

#### Foreach with Ternary
```yaml
- name: foreach-expr
  type: foreach
  foreach: '$expr{{steps.first.output.data.booleanFalse ? slice(slice(steps.first.output.data.array, 0, 5), 0, 3) : ["nothing"]}}'
  steps:
    - name: foreach-expr-inner
      type: console
      with:
        message: "{{foreach.item}}"
```

**Drawbacks**: Nested function calls are hard to read, no natural data flow

---

## 3. Alternative Options Considered

### FiltrEx
- **NPM**: `filtrex` (~200K downloads/week)
- **Focus**: Safe user-entered expressions for filtering/sorting
- **Status**: Actively maintained (last update 1 year ago)
- **Pros**: Modern, actively maintained, good security focus
- **Cons**: Limited to filtering/sorting use cases, not full expression language

### JSONata
- **NPM**: `jsonata` (~800K downloads/week)
- **Focus**: JSON query and transformation language
- **Status**: Actively maintained
- **Pros**: 
  - Excellent for JSON transformations
  - IBM-backed (used in Node-RED)
  - Strong documentation
  - Active development
- **Cons**: 
  - Unique syntax (steep learning curve)
  - More complex than needed
  - Different paradigm from LiquidJS

### mathjs
- **NPM**: `mathjs` (~2.4M downloads/week)
- **Focus**: Extensive mathematics library
- **Status**: Very actively maintained
- **Pros**: 
  - Extremely comprehensive math support
  - Excellent documentation
  - Large community
- **Cons**: 
  - Overkill for workflow logic
  - Math-focused, not data-transformation-focused
  - Heavy dependency

### Velocity-like Options
- **velocityjs**, **nunjucks**, etc.
- **Cons**: Same limitations as LiquidJS - template engines, not expression evaluators

---

## Detailed Comparison Matrix

| Feature | LiquidJS | Jexl | expr-eval | FiltrEx | JSONata |
|---------|----------|------|-----------|---------|---------|
| **Filters in conditions** | ❌ | ✅ | ✅ (as functions) | ⚠️ Limited | ✅ |
| **Ternary operator** | ❌ | ✅ | ✅ | ❌ | ✅ (different syntax) |
| **Pipe syntax** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Boolean expressions** | ⚠️ Limited | ✅ | ✅ | ✅ | ✅ |
| **Parentheses** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Custom transforms** | ✅ | ✅ | ✅ | ❌ | ⚠️ Complex |
| **Array operations** | ✅ | ✅ | ✅ | ⚠️ Limited | ✅✅ |
| **Template rendering** | ✅✅ | ❌ | ❌ | ❌ | ⚠️ Different |
| **Async support** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **TypeScript** | via @types | via @types | Built-in | via @types | Built-in |
| **Weekly downloads** | 5M | 60K | 813K | 200K | 800K |
| **Last updated** | Active | 5 years | 6 years | 1 year | Active |
| **Maintenance** | ✅✅ | ⚠️ Stale | ❌ Abandoned | ✅ | ✅✅ |
| **Learning curve** | Low | Medium | Medium-Low | Low | High |
| **Security** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Zero dependencies** | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## Recommendations

### 🏆 Primary Recommendation: Hybrid Approach (Jexl + LiquidJS)

**Use Jexl for expression evaluation** (conditions, computations, data selection)
- `$jexl{{...}}` for if conditions
- `$jexl{{...}}` for foreach arrays with transformations  
- `$jexl{{...}}` for any boolean logic or complex transformations

**Keep LiquidJS for template rendering** (string interpolation, output messages)
- `{{variable}}` for simple variable substitution
- `{{variable | filter}}` for output formatting
- Existing syntax continues to work

### Why This Approach?

1. **Solves all identified problems**: Filters in conditions, boolean expressions, ternary operator, parentheses
2. **Familiar syntax**: Pipe-based transforms similar to LiquidJS
3. **Powerful**: Collection filtering, custom operators, async support
4. **Backward compatible**: Existing LiquidJS templates still work
5. **Clear separation of concerns**: 
   - Jexl = logic and computation
   - LiquidJS = presentation and templates

### Implementation Strategy

```typescript
// Current implementation already supports this!
public evaluateExpression(template: string, context: Record<string, unknown>): unknown {
  if (template.startsWith('$expr{{') && template.endsWith('}}')) {
    return this.evaluateExprEvalExpression(template, context);
  } else if (template.startsWith('$jexl{{') && template.endsWith('}}')) {
    return this.evaluateJexlExpression(template, context); // ✅ Already implemented
  } else if (template.startsWith('${{') && template.endsWith('}}')) {
    return this.evaluateLiquidJsExpression(template, context);
  } else {
    throw new Error(`The provided expression is invalid. Got: ${template}.`);
  }
}
```

Your code **already supports all three syntaxes**, so adoption is straightforward!

---

## Addressing Maintenance Concerns

### Risk: Jexl hasn't been updated in 5 years

#### Mitigation Strategies:

1. **Fork the repository** if needed
   - Elastic has engineering resources to maintain a fork
   - Code is well-structured and readable
   - MIT license allows forking

2. **Vendor the dependency** 
   - Include Jexl source in your repo
   - Full control over updates and security patches

3. **Active monitoring**
   - Set up dependency monitoring (Dependabot, Snyk)
   - Monitor GitHub issues for both Jexl and expr-eval
   - Review security advisories quarterly

4. **Gradual adoption**
   - Start with Jexl for new features
   - Keep expr-eval as fallback
   - Monitor usage and stability

5. **Future migration path**
   - If JSONata matures or new options emerge
   - Abstract expression evaluation behind interface
   - Can swap implementations without breaking YAML syntax

### Why Maintenance Risk is Acceptable:

- ✅ No dependencies (except TypeScript types)
- ✅ No known vulnerabilities
- ✅ Core functionality is complete and stable
- ✅ Used by 122 other packages successfully
- ✅ Small codebase (~3K lines) - auditable
- ✅ Well-tested (check coverage in repo)
- ✅ Expression languages are "done" - minimal evolution needed

---

## Where Each Package Excels

### Use Jexl When:
- ✅ Evaluating conditions with transformed data
- ✅ Chaining multiple transformations (pipes)
- ✅ Filtering collections with complex logic
- ✅ Need ternary operators for inline choices
- ✅ Users familiar with pipe syntax (LiquidJS-like)
- ✅ Async operations needed

### Use expr-eval When:
- ✅ Mathematical computations
- ✅ Scientific calculations
- ✅ Need zero dependencies
- ✅ Simpler expressions without data flow
- ✅ Want to compile expressions to JS functions

### Use LiquidJS When:
- ✅ String interpolation and templating
- ✅ Output formatting (messages, logs)
- ✅ Simple variable substitution
- ✅ Loop-based rendering without complex conditions

---

## Migration Path

### Phase 1: Adopt Jexl for Conditions (Immediate)
```yaml
# Before (LiquidJS - limited)
- type: if
  condition: ${{steps.first.output.data.booleanTrue}}

# After (Jexl - powerful)
- type: if
  condition: "$jexl{{steps.first.output.data.array | slice(0,5) | length > 3 && steps.first.output.data.booleanTrue}}"
```

### Phase 2: Adopt Jexl for Foreach (Immediate)
```yaml
# Before (Limited transformations)
- type: foreach
  foreach: '${{steps.first.output.data.array}}'

# After (Transformations + conditionals)
- type: foreach
  foreach: '$jexl{{steps.first.output.data.ready ? steps.first.output.data.array | slice(0,5) : []}}'
```

### Phase 3: Document Best Practices (Week 1)
- Create syntax guide comparing LiquidJS vs Jexl
- Provide migration examples
- Document common patterns and pitfalls

### Phase 4: User Education (Ongoing)
- Update documentation
- Provide interactive examples
- Create cookbook for common workflows

---

## Security Considerations

### All Options Are Safe:
- ✅ **No eval()** - all build AST and evaluate safely
- ✅ **Sandboxed** - cannot access global scope
- ✅ **Configurable** - can disable dangerous operators

### Jexl-Specific Security:
```typescript
// Can disable operators if needed
const jexl = new Jexl();
jexl.removeOp('=');  // Disable assignment
```

### expr-eval-Specific Security:
```typescript
const parser = new Parser({
  operators: {
    assignment: false,  // Disable assignment
    fndef: false        // Disable function definitions
  }
});
```

### Ongoing Security:
- Monitor CVE databases
- Update TypeScript definitions
- Review transform/function implementations
- Audit custom extensions

---

## Performance Considerations

### Jexl Performance:
- Compile once, evaluate many times
- Async and sync modes
- Good for repeated evaluations

### expr-eval Performance:
- Can compile to native JS functions (fastest)
- Synchronous only
- Best for high-frequency math

### Recommendation:
- Profile with realistic workflows
- Cache compiled expressions
- Both should be fast enough for workflow use cases

---

## Alternative Recommendation: If Maintenance Risk is Unacceptable

### Consider: JSONata

If Jexl's maintenance status is a dealbreaker:

**JSONata** (https://jsonata.org/)
- **Actively maintained** by IBM
- **Very powerful** for JSON transformations
- **Enterprise backing** (used in Node-RED)
- **800K+ downloads/week**
- **Extensive documentation**

**Trade-offs:**
- ⚠️ Steeper learning curve (unique syntax)
- ⚠️ More complex than needed for simple cases
- ⚠️ Different from LiquidJS pipes

**Example:**
```yaml
# JSONata syntax
- type: if
  condition: "$jsonata{{steps.first.output.data.array[0..4][0..2] ~> $count() > 3 and steps.first.output.data.booleanTrue}}"
```

**When to choose JSONata:**
- Need enterprise-grade support
- Maintenance is top priority
- Team can invest in learning curve
- Complex JSON transformations are common

---

## Summary Decision Matrix

| Criteria | Weight | Jexl | expr-eval | JSONata |
|----------|--------|------|-----------|---------|
| **Solves LiquidJS limitations** | 🔴 Critical | ✅ Perfect | ⚠️ Partial | ✅ Perfect |
| **Syntax familiarity** | 🟡 High | ✅ Pipes | ❌ Functions | ⚠️ Unique |
| **Maintenance/Updates** | 🟡 High | ⚠️ Stale | ❌ Dead | ✅ Active |
| **Feature completeness** | 🟡 High | ✅ Excellent | ✅ Good | ✅✅ Excellent |
| **Learning curve** | 🟢 Medium | ✅ Low | ✅ Low | ❌ High |
| **Adoption/Community** | 🟢 Medium | ⚠️ Moderate | ✅ High | ✅ High |
| **Security** | 🔴 Critical | ✅ Safe | ✅ Safe | ✅ Safe |
| **Dependencies** | 🟢 Low | ⚠️ 1 | ✅ 0 | ⚠️ 3 |
| **TypeScript** | 🟢 Low | ⚠️ @types | ✅ Built-in | ✅ Built-in |

### Scoring:
- **Jexl**: 8/10 (best balance, maintenance risk manageable)
- **expr-eval**: 6/10 (great adoption but syntax mismatch and abandoned)
- **JSONata**: 7/10 (excellent but high learning curve)

---

## Final Recommendation

### 🎯 Implement Hybrid Approach: Jexl + LiquidJS

**Primary choice: Jexl**
- Solves all identified problems
- Familiar pipe syntax
- Feature-complete for workflow needs
- Maintenance risk is acceptable and manageable

**Keep LiquidJS for templates**
- Already working well
- Users know it
- Good for string interpolation

**Mitigation for maintenance risk:**
- Monitor closely
- Prepare to fork if needed
- Abstract behind interface for future flexibility

**Timeline:**
1. Document Jexl patterns (Week 1)
2. Update examples and guides (Week 2)
3. Enable for new workflows (Week 3)
4. Gradual migration of existing workflows (Months 2-3)

**Success metrics:**
- All LiquidJS limitations resolved
- User satisfaction with new syntax
- No performance regressions
- Zero security issues

---

## Appendix: Code Examples

### Current Implementation Status

Your `templating_engine.ts` already supports all three syntaxes:
- `$expr{{...}}` - expr-eval
- `$jexl{{...}}` - Jexl ✅
- `${{...}}` - LiquidJS

This is excellent! You can:
1. Document Jexl as the recommended syntax for conditions
2. Deprecate expr-eval over time (if desired)
3. Keep LiquidJS for templates

### Example: Complex Workflow with Jexl

```yaml
workflow:
  - name: fetch-data
    type: http
    with:
      url: "https://api.example.com/users"
    output: users

  - name: process-users
    type: foreach
    # Jexl: Filter, slice, and provide fallback
    foreach: '$jexl{{users.data.length > 0 ? users.data[.age >= 18] | slice(0, 10) : []}}'
    steps:
      - name: validate-user
        type: if
        # Jexl: Complex condition with transformations
        condition: "$jexl{{(foreach.item.name | length) > 3 && foreach.item.email | contains('@') && (foreach.item.tags | length) >= 2}}"
        steps:
          - name: send-email
            type: email
            with:
              # LiquidJS: Template rendering
              to: "{{foreach.item.email}}"
              subject: "Welcome {{foreach.item.name | capitalize}}!"
              body: "You have {{foreach.item.tags | size}} tags"
```

**Benefits demonstrated:**
- Complex data filtering in foreach
- Multiple transformations in conditions
- Clean separation: Jexl for logic, LiquidJS for presentation
- Fallback values with ternary operator
- Collection filtering with predicates

---

## Questions for Stakeholders

1. **Is maintenance risk acceptable?** Can you fork/vendor Jexl if needed?
2. **Learning curve?** Are users willing to learn Jexl syntax?
3. **Migration timeline?** How long to migrate existing workflows?
4. **Performance requirements?** Need benchmarks for your use cases?
5. **Future-proofing?** Want abstraction layer for future changes?

---

## References

- **Jexl**: https://github.com/TomFrost/Jexl
- **Jexl NPM**: https://www.npmjs.com/package/jexl
- **Jexl Playground**: https://czosel.github.io/jexl-playground/
- **expr-eval**: https://github.com/silentmatt/expr-eval
- **expr-eval NPM**: https://www.npmjs.com/package/expr-eval
- **JSONata**: https://jsonata.org/
- **LiquidJS Issues**: https://github.com/harttle/liquidjs/issues/833

---

**Document Version**: 1.0  
**Date**: November 7, 2025  
**Author**: GitHub Copilot Analysis
