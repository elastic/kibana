/* eslint import/named: 0 */
import {
  GuideExample,
} from '../../components';

export default function creatExample(examples) {
  class Example extends GuideExample {
    constructor(props) {
      super(props, examples);
    }
  }

  Example.propTypes = {
    ...GuideExample.propTypes
  };

  return Example;
}
