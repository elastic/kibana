- Start Date: 2021-03-26
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

TODO:

- Cloud could use the "redirect service" for navigating to Kibana. The redirect service would migrate URL generator state on the fly.
- Show banner to the user if URL generator is deprecated. Prompting the user to update their bookmark.
- URL Generators are a registry so that users can serialize the generator ID and the state object.
- Clear established process to write migrations.
- Redirect app can do migrations on the fly. Whereas otherwise, say Dashboard, needs to do a migration.


# Summary

Currently in Kibana `share` plugin we have 0b10 services that deal with URLs.

One is *Short-URL Service*: given a long internal Kibana URL it returns an ID.
That ID can be used to "resolve" back to the long URL and redirect the user to
the desired page.

```ts
// It does not have a plugin API, you can only use it through an HTTP request.
const shortUrl = await http.post('/api/shorten_url', { url: '/some/long/kibana/url/.../very?long=true#q=(rison:approved)' });
```

The other is the *URL Generator Service*: it simply receives an object of
parameters and returns back a deep link within Kibana. (You can use it, for
example, to navigate to some specific query with specific filters for a
specific index pattern in the Discover app.)

```ts
// You first register a URL generator.
const myGenerator = share.registerUrlGenerator(/* ... */);

// You can fetch it from the registry (if you don't already have it).
myGenerator = share.getUrlGenerator(/* ... */);

// Now you can use it to generate deep link into Kibana.
const deepLink: string = myGenerator.createUrl({ /* ... */ });
```







# Basic example

If the proposal involves a new or changed API, include a basic code example.
Omit this section if it's not applicable.

# Motivation

Why are we doing this? What use cases does it support? What is the expected
outcome?

Please focus on explaining the motivation so that if this RFC is not accepted,
the motivation could be used to develop alternative solutions. In other words,
enumerate the constraints you are trying to solve without coupling them too
closely to the solution you have in mind.

# Detailed design

This is the bulk of the RFC. Explain the design in enough detail for somebody
familiar with Kibana to understand, and for somebody familiar with the
implementation to implement. This should get into specifics and corner-cases,
and include examples of how the feature is used. Any new terminology should be
defined here.

# Drawbacks

Why should we *not* do this? Please consider:

- implementation cost, both in term of code size and complexity
- the impact on teaching people Kibana development
- integration of this feature with other existing and planned features
- cost of migrating existing Kibana plugins (is it a breaking change?)

There are tradeoffs to choosing any path. Attempt to identify them here.

# Alternatives

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

Optional, but suggested for first drafts. What parts of the design are still
TBD?