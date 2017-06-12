
// **DON'T USE THIS**
// Performing joins/math with other sets that don't match perfectly will be wrong
// Does not resample at all.
export default function none(dataTuples) {
  return dataTuples;
}