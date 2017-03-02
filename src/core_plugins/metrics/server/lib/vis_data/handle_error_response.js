export default panel => error => {
  console.log(error);
  const result = {};
  let errorResponse;
  try {
    errorResponse = JSON.parse(error.response);
  } catch (e) {
    errorResponse = error.response;
  }
  result[panel.id] = {
    id: panel.id,
    statusCode: error.statusCode,
    error: errorResponse || error,
    series: []
  };
  return result;
};
