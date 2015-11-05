# 1.3.0

* Adds a new node type, `String`, to fix a crash on selectors such as
  `foo:bar("test")`.

# 1.2.1

* Fixes a crash when the parser encountered a trailing combinator.

# 1.2.0

* A more descriptive error is thrown when the parser expects to find a
  pseudo-class/pseudo-element (thanks to @ashelley).
* Adds support for line/column locations for selector nodes, as well as a
  `Node#sourceIndex` method (thanks to @davidtheclark).

# 1.1.4

* Fixes a crash when a selector started with a `>` combinator. The module will
  now no longer throw if a selector has a leading/trailing combinator node.

# 1.1.3

* Fixes a crash on `@` tokens.

# 1.1.2

* Fixes an infinite loop caused by using parentheses in a non-pseudo element
  context.

# 1.1.1

* Fixes a crash when a backslash ended a selector string.

# 1.1.0

* Adds support for replacing multiple nodes at once with `replaceWith`
  (thanks to @jonathantneal).
* Parser no longer throws on sequential IDs and trailing commas, to support
  parsing of selector hacks.

# 1.0.1

* Fixes using `insertAfter` and `insertBefore` during iteration.

# 1.0.0

* Adds `clone` and `replaceWith` methods to nodes.
* Adds `insertBefore` and `insertAfter` to containers.
* Stabilises API.

# 0.0.5

* Fixes crash on extra whitespace inside a pseudo selector's parentheses.
* Adds sort function to the container class.
* Enables the parser to pass its input through without transforming.
* Iteration-safe `each` and `eachInside`.

# 0.0.4

* Tidy up redundant duplication.
* Fixes a bug where the parser would loop infinitely on universal selectors
  inside pseudo selectors.
* Adds `length` getter and `eachInside`, `map`, `reduce` to the container class.
* When a selector has been removed from the tree, the root node will no longer
  cast it to a string.
* Adds node type iterators to the container class (e.g. `eachComment`).
* Adds filter function to the container class.
* Adds split function to the container class.
* Create new node types by doing `parser.id(opts)` etc.
* Adds support for pseudo classes anywhere in the selector.

# 0.0.3

* Adds `next` and `prev` to the node class.
* Adds `first` and `last` getters to the container class.
* Adds `every` and `some` iterators to the container class.
* Add `empty` alias for `removeAll`.
* Combinators are now types of node.
* Fixes the at method so that it is not an alias for `index`.
* Tidy up creation of new nodes in the parser.
* Refactors how namespaces are handled for consistency & less redundant code.
* Refactors AST to use `nodes` exclusively, and eliminates excessive nesting.
* Fixes nested pseudo parsing.
* Fixes whitespace parsing.

# 0.0.2

* Adds support for namespace selectors.
* Adds support for selectors joined by escaped spaces - such as `.\31\ 0`.

# 0.0.1

* Initial release.
