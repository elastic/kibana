import _ from 'lodash';
import handlebars from 'handlebars/dist/handlebars';
export default function replaceVars(str, args = {}, vars = {}) {
  try {
    const template = handlebars.compile(str);
    return template(_.assign({}, vars, { args }));
  } catch (e) {
    return str;
  }
}
