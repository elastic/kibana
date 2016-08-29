export default function mapQueryStringProvider(Promise) {
  return function (filter) {
    let key;
    let value;
    if (filter.query && filter.query.query_string) {
      key = 'query';
      value = filter.query.query_string.query;
      return Promise.resolve({ key: key, value: value });
    }
    return Promise.reject(filter);
  };
}
