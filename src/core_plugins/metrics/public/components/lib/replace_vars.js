import _ from 'lodash';
import handlebars from 'handlebars/dist/handlebars';
export default function replaceVars(str, args = {}, vars = {}) {
  try {
    const template = handlebars.compile(str, { strict: true });

    const string = template(_.assign({}, vars, { args }));

    return string;
  } catch (e) {
    // user is probably typing and so its not formed correctly
    if (e.toString().indexOf('Parse error') !== -1) {
      return str;

      // Unknown variable
    } else if (e.message.indexOf('not defined in') !== -1) {
      const badVar = e.message.split(/"/)[1];
      e.error = {
        caused_by: {
          reason: `{{${badVar}}} is an unknown variable`,
          title: 'Error processing your markdown'
        }
      };
    } else {
      e.error = {
        caused_by: {
          reason: 'Please verify you are only using markdown, known variables, and built-in Handlebars expressions',
          title: 'Error processing your markdown'
        }
      };
    }
    return e;
  }
}
