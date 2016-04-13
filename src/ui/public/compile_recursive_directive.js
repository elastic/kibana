define(function (require) {
  const _ = require('lodash');

  /**
   * Angular can't render directives that render themselves recursively:
   * http://stackoverflow.com/a/18609594/296172
   */

  require('ui/modules')
  .get('kibana')
  .service('compileRecursiveDirective', function ($compile) {
    return {
      /**
       * Manually compiles the element, fixing the recursion loop.
       * @param element
       * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
       * @returns An object containing the linking functions.
       */
      compile: function (element, link) {
        // Normalize the link parameter
        if (_.isFunction(link)) {
          link = {
            post: link
          };
        }

        // Break the recursion loop by removing the contents
        const contents = element.contents().remove();
        let compiledContents;
        return {
          pre: (link && link.pre) ? link.pre : null,
          /**
           * Compiles and re-adds the contents
           */
          post: function (scope, element) {
            // Compile the contents
            if (!compiledContents) {
              compiledContents = $compile(contents);
            }
            // Re-add the compiled contents to the element
            compiledContents(scope, function (clone) {
              element.append(clone);
            });

            // Call the post-linking function, if any
            if (link && link.post) {
              link.post.apply(null, arguments);
            }
          }
        };
      }
    };
  });
});
