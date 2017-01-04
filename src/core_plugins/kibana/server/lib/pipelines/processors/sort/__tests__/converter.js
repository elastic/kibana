// import expect from 'expect.js';
// import _ from 'lodash';
// import { kibanaToEs, esToKibana } from '../converter';

// describe('ingest', () => {

//   describe('processors', () => {

//     describe('converters', () => {

//       describe('set', () => {

//         describe('kibanaToEs', () => {

//           let source;
//           let expected;
//           beforeEach(function () {
//             source = {
//               processor_id: 'foo_processor_id',
//               target_field: 'foo_target_field',
//               value: 'foo_value',
//               failure_action: 'foo_failure_action'
//             };

//             expected = {
//               set: {
//                 tag: 'foo_processor_id',
//                 field: 'foo_target_field',
//                 value: 'foo_value',
//                 failure_action: 'foo_failure_action'
//               }
//             };
//           });

//           it('should convert from a kibana api object to an elasticsearch object', () => {
//             const actual = kibanaToEs(source);
//             expect(_.isEqual(actual, expected)).to.be.ok();
//           });

//           it('should ignore additional source fields', () => {
//             source.foo = 'bar';
//             source.bar = 'baz';

//             const actual = kibanaToEs(source);
//             expect(_.isEqual(actual, expected)).to.be.ok();
//           });

//         });

//         describe('esToKibana', () => {

//           let source;
//           let expected;
//           beforeEach(function () {
//             source = {
//               set: {
//                 tag: 'foo_tag',
//                 field: 'foo_field',
//                 value: 'foo_value',
//                 failure_action: 'foo_failure_action'
//               }
//             };

//             expected = {
//               typeId: 'set',
//               processor_id: 'foo_tag',
//               target_field: 'foo_field',
//               value: 'foo_value',
//               failure_action: 'foo_failure_action'
//             };
//           });

//           it('should convert from an elasticsearch object to a kibana api object', () => {
//             const actual = esToKibana(source);
//             expect(_.isEqual(actual, expected)).to.be.ok();
//           });

//           it('should ignore additional source fields', () => {
//             source.set.foo = 'bar';
//             source.set.bar = 'baz';

//             const actual = esToKibana(source);
//             expect(_.isEqual(actual, expected)).to.be.ok();
//           });

//           it('should throw an error if argument does not have an [set] property', () => {
//             const errorMessage = /elasticsearch processor document missing \[set\] property/i;

//             source.foo = _.clone(source.set);
//             delete source.set;
//             expect(esToKibana).withArgs(source).to.throwException(errorMessage);

//             expect(esToKibana).withArgs(null).to.throwException(errorMessage);
//             expect(esToKibana).withArgs(undefined).to.throwException(errorMessage);
//             expect(esToKibana).withArgs('').to.throwException(errorMessage);
//             expect(esToKibana).withArgs({}).to.throwException(errorMessage);
//           });

//         });

//       });

//     });

//   });

// });
