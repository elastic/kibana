# Risk consideration

When merging a new feature of considerable size or modifying an existing one,
consider adding a *Risk Matrix* section to your PR in collaboration with other
developers on your team and the QA team.

Below are some general themes to consider for the *Risk Matrix*:


## General risks

- What happens when your feature is used in a non-default space or a custom
  space?
- What happens when Kibana is run in a cluster mode?
- What happens when plugin you depend on is disabled?
- What happens when feature you depend on is disabled?
- Is your change working correctly regardless of `kibana.yml` configuration or
  UI Setting configuration? (For example, does it support both
  `state:storeInSessionStorage` UI setting states?)
- What happens when a third party integration you depend on is not responding?
- How is authentication handled with third party services?
- Does the feature work in Elastic Cloud?
- Does the feautre create a setting that needs to be exposed, or configured
  differently than the default, on the Elastic Cloud?
- Is there a significant performance impact that may affect Cloud Kibana
  instances?
- Does your feature need to be aware of running in a container?
- Does the feature Work with security disabled, or fails gracefully?
- Are there performance risks associated with your feature? Does it access:
  (1) many fields; (2) many indices; (3) lots of data; (4) lots of saved
  objects; (5) large saved objects.
- Will leaving browser running overnight not have negative impacts ot the page
  and server performance?
- Will your feature still work if Kibana is run behind a reverse proxy?
- Does your feature affect other plugins?
- If you write to the file system, what happens if Kibana node goes down? What
  happens if Kibana is run in cluster mode?
- Are migrations handled gracefully? Does the feature affect old indices or
  saved objects?
- Are you using any technologies, protocols, techniques, conventions, libraries,
  NPM modules, etc. that may be new or unprecedented in Kibana?


## Security risks

- XSS attacks&mdash;can user inject unescaped HTML on the page? (For example through
  React's `dangerouslySetInnerHtml`, `Element.innerHTML`, `Element.outerHTML`).
  Is all user input escaped?
- CSRF attacks&mdash;are you not using the default Kibana HTTP service to
  communicate with the server? If not ensure you configure correctly CSRF header
  and talk with security team to review.
- Remote code execution attacks&mdash;is your code doing something "highly"
  dynamic? Such as: (1) usage of `eval` function; (2) usage of `vm` or
  `child_process` Node.js modules; (3) usage of dynamic requires; (4) running
  template interpolation such as Handlebars or Lodash `_.template`.
- [Prototype pollution attacks](https://docs.google.com/document/d/19V-d9sb6IF-fbzF4iyiPpAropQNydCnoJApzSX5FdcI/edit?usp=sharing).
- User input validation&mdash;are you validating user input beyond the default
  HTTP server schema validation? Are you validating complex user input, such
  as expression language or KQL?
- Check for accidental reveal of sensitive information. It could be printed to
  console through logs or errors.
