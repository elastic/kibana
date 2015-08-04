define(function (require) {
  return function CourierFetchRequestStatus() {
    return {
      ABORTED: { CourierFetchRequestStatus: 'aborted' },
      DUPLICATE: { CourierFetchRequestStatus: 'duplicate' },
      INCOMPLETE: { CourierFetchRequestStatus: 'incomplete' }
    };
  };
});
