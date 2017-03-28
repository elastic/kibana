import moment from 'moment';
export default function getTimerange(req) {
  const from = moment.utc(req.payload.timerange.min);
  const to = moment.utc(req.payload.timerange.max);
  return { from, to };
}
