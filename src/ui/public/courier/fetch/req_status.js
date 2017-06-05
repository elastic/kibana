export function ReqStatusProvider() {
  return {
    ABORTED: { CourierFetchRequestStatus: 'aborted' },
    DUPLICATE: { CourierFetchRequestStatus: 'duplicate' },
    INCOMPLETE: { CourierFetchRequestStatus: 'incomplete' }
  };
}
