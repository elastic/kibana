import moment from 'moment';
import parse from 'plugins/rework/lib/date_math';


export default (from, to) => {
  return {
    min: parse(from),
    max: parse(to, true)
  };
};
