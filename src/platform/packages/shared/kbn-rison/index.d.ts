export * from './kbn_rison';
import { encode, encodeUnknown, decode, encodeArray, decodeArray } from './kbn_rison';
declare const _default: {
    encode: typeof encode;
    encodeUnknown: typeof encodeUnknown;
    decode: typeof decode;
    encodeArray: typeof encodeArray;
    decodeArray: typeof decodeArray;
};
export default _default;
