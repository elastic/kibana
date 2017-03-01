import getTimerange from './helpers/get_timerange';
export default function offsetTime(req, by) {
  const { from, to } = getTimerange(req);
  if (!/^([\d]+)([shmdwMy]|ms)$/.test(by)) return { from, to };
  const matches = by.match(/^([\d]+)([shmdwMy]|ms)$/);
  const offsetValue = Number(matches[1]);
  const offsetUnit = matches[2];
  return {
    from: from.clone().subtract(offsetValue, offsetUnit),
    to: to.clone().subtract(offsetValue, offsetUnit)
  };
}
