export default (type) => (payload, error = null, meta = null) => ({ type, payload, error, meta });
