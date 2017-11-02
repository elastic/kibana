import expect from 'expect.js';
import utils from '../utils';

describe('plugins/analyzeui', async () => {
  describe('public/utils', async () => {
    describe('#parseCustom', async () => {
      it('string & object successful', async () => {
        const stringAnalyzer = 'analyzer';
        const jsonAnalyzer = { 'type': 'nGram', 'min_gram': 2, 'max_gram': 2 };
        const $scope = {};

        expect(utils.parseCustom($scope, stringAnalyzer, 'type')).to.eql(stringAnalyzer);
        expect(utils.parseCustom($scope, JSON.stringify(jsonAnalyzer), 'type')).to.eql(jsonAnalyzer);
      });
      it('unexpected type error', async () => {
        const integerAnalyzer = 1;
        const $scope = {};
        expect(utils.parseCustom($scope, integerAnalyzer, 'type')).to.eql(-1);
        expect($scope.analyzerError).to.eql('unexpected type in type');
      });
      // can't produce this case...
      //it('unexpected object error', () => {});
      it('JSON parse exception', () => {
        const brokenJson = '{\'type\': \'nGram\'';
        const $scope = {};
        expect(utils.parseCustom($scope, brokenJson, 'type')).to.eql(-1);
        expect($scope).to.only.have.keys('analyzerError');
      });
    });
    describe('#getLength', async () => {
      it('successful case: current < tokenArray\'s position', () => {
        const current = 1;
        const tokenArray = [ { position: 0 }, { position: 1 } ];
        expect(utils.getLength(current, tokenArray)).to.eql(tokenArray[1].position + 1);
      });
      it('success case: current >= tokenArray\'s position', () => {
        const current = 4;
        const tokenArray = [ { position: 0 }, { position: 1 } ];
        expect(utils.getLength(current, tokenArray)).to.eql(current);
      });
      it('empty array', () => {
        const current = 1;
        const tokenArray = [];
        expect(utils.getLength(current, tokenArray)).to.eql(current);
      });
      it('an element has no position property', () => {
        const current = 1;
        const tokenArray = [ { post: 1 } ];
        expect(utils.getLength(current, tokenArray)).to.eql(current);
      });
    });
    describe('#countTokenStreamLength', async () => {
      it('detail has tokenizer', async () => {
        const expected = [0, 1];
        const detail = { tokenizer: { tokens: [ { position: 0 }, { position: 1 } ] } };
        const $scope = {};
        utils.countTokenStreamLength($scope, detail);
        expect($scope).to.only.have.keys('tokenIndicesArray');
        expect($scope.tokenIndicesArray).to.eql(expected);
      });
      it('detail has analyzer', async () => {
        const expected = [0, 1];
        const detail = { analyzer: { tokens: [ { position: 0 }, { position: 1 } ] } };
        const $scope = {};
        utils.countTokenStreamLength($scope, detail);
        expect($scope).to.only.have.keys('tokenIndicesArray');
        expect($scope.tokenIndicesArray).to.eql(expected);
      });
      it('detail has analyzer & tokenizer', async () => {
        // this is unexpected case in _analyze API
        const expected = [0];
        const detail = { analyzer: { tokens: [ { position: 0 }, { position: 1 } ] },
          tokenizer: { tokens: [ { position: 0 }] } };
        const $scope = {};
        utils.countTokenStreamLength($scope, detail);
        expect($scope).to.only.have.keys('tokenIndicesArray');
        expect($scope.tokenIndicesArray).to.eql(expected);
      });
      it('detail has tokenizer & tokenfilters, then tokenfilters > tokenizer', async () => {
        const expected = [0, 1];
        const detail = { tokenizer: { tokens: [ { position: 0 } ] },
          tokenfilters: [
            { tokens: [ { position: 0 }, { position: 1 } ] },
            { tokens: [ { position: 0 } ] }
          ]
        };
        const $scope = {};
        utils.countTokenStreamLength($scope, detail);
        expect($scope).to.only.have.keys('tokenIndicesArray');
        expect($scope.tokenIndicesArray).to.eql(expected);
      });
      it('detail has tokenizer & tokenfilters, then tokenfilters <= tokenizer', async () => {
        const expected = [0, 1];
        const detail = { tokenizer: { tokens: [ { position: 0 }, { position: 1 } ] },
          tokenfilters: [
            { tokens: [ { position: 0 } ] },
            { tokens: [ { position: 0 } ] }
          ]
        };
        const $scope = {};
        utils.countTokenStreamLength($scope, detail);
        expect($scope).to.only.have.keys('tokenIndicesArray');
        expect($scope.tokenIndicesArray).to.eql(expected);
      });
      it('detail is empty', async () => {
        const expected = [];
        const detail = {};
        const $scope = {};
        utils.countTokenStreamLength($scope, detail);
        expect($scope).to.only.have.keys('tokenIndicesArray');
        expect($scope.tokenIndicesArray).to.eql(expected);
      });
    });

    describe('#initialItems', async () => {
      it('empty', async () => {
        const expectedArray = [];
        const results = utils.initialItems(0);
        expect(results).to.eql(expectedArray);
      });
      it('not empty', async () =>{
        const expectedArray = [ { 'item': '', 'id': 0 }, { 'item': '', 'id': 1 } ];
        const results = utils.initialItems(2);
        expect(results).to.eql(expectedArray);
      });
    });

    describe('#addItem&removeItem', async() => {
      it('successful', async () => {
        const array = [];
        const expectedArray = [ { 'item': '', 'id': 0 } ];
        utils.addItem(array);
        expect(array).to.eql(expectedArray);
        utils.removeItem(0, array);
        expect(array).to.eql([]);
      });
    });
  });
});
