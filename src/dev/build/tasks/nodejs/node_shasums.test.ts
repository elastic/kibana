/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const mockResponse = `155ae63f0bb47050e0c31b4f8c17dadc79dcfa8e8f4ec9e3974fd7592afa9a4f  node-v8.9.4-aix-ppc64.tar.gz
ca50f7d2035eb805306e303b644bb1cde170ce2615e0a2c6e95fb80881c48c24  node-v8.9.4-darwin-x64.tar.gz
cb79e2da37d2b646a06adaddcda67ff6ba0f77f9ca733b041dabf3dad79c7468  node-v8.9.4-darwin-x64.tar.xz
ef7248e81706daeeec946c19808a50b60ac250e648365d78fda6e40f1f9b23a5  node-v8.9.4-headers.tar.gz
11ed407a4bc3d8c3e73305ac54e91e64c9a9f6a2ae5476791d6fcc14ac159bfc  node-v8.9.4-headers.tar.xz
2b133c7d23033fbc2419e66fc08bba35c427a97aba83ed6848b6b4678c0cac65  node-v8.9.4-linux-arm64.tar.gz
7c0369a5dbc98d0989c208ca3ee1b6db4cba576343014fdbf7d36fd2659f7089  node-v8.9.4-linux-arm64.tar.xz
81f138e935323246bd5da518eb0ea8ad00008f3c8a8d606e17589a545a9c73d1  node-v8.9.4-linux-armv6l.tar.gz
501bcae62ea1769924facc9628f407d37753e7a024cf3b12a18ea9dab1b380c9  node-v8.9.4-linux-armv6l.tar.xz
a0dd9009cb8d4be89c8a31131df16ad5ea1580d10ae426c5142aa34b0ad4ea76  node-v8.9.4-linux-armv7l.tar.gz
fe19f195df3d4f362d0cf0eef43c1a6a0b6006a1be2a89ee1808091c2ef4d722  node-v8.9.4-linux-armv7l.tar.xz
c5df73b8571edf97f83b484d6139332fad3b710d51be4aeb8d846059862d4675  node-v8.9.4-linux-ppc64le.tar.gz
21178be5e4c1dbdd99610d24aa934234a368c542ebabb3d98c31d393cf4adf06  node-v8.9.4-linux-ppc64le.tar.xz
d6e53ab2f8364528d4c6800adc1e7fccec607fd07a97b83985732c749a7fc846  node-v8.9.4-linux-s390x.tar.gz
90c6c284db9482a478dd5110e2171435156d56a013aeda2f636b6240eba156bd  node-v8.9.4-linux-s390x.tar.xz
21fb4690e349f82d708ae766def01d7fec1b085ce1f5ab30d9bda8ee126ca8fc  node-v8.9.4-linux-x64.tar.gz
68b94aac38cd5d87ab79c5b38306e34a20575f31a3ea788d117c20fffcca3370  node-v8.9.4-linux-x64.tar.xz
cc2f7a300353422ede336f5e72b71f0d6eac46732a31b7640648378830dd7513  node-v8.9.4-linux-x86.tar.gz
79f241f31eab5dfe2976fb0633c598dababd207ab0b8a163004f296cd7794a65  node-v8.9.4-linux-x86.tar.xz
b93767f7e186b1ae7204fedafa4110534f577d18d4204f422b626afdd5061e28  node-v8.9.4.pkg
e4a5d945091043c937125cd0d515258785cd4ea806fe3b77000d888de23d2ba0  node-v8.9.4-sunos-x64.tar.gz
b33e8f1495b88fcc0ab1e2579f2f7cf4d39886d577430dcb920a024829d4cf28  node-v8.9.4-sunos-x64.tar.xz
551729411793e427f5760fe8e46f45612e1e8e7c63e55ad34243ebf8ea9a4a7a  node-v8.9.4-sunos-x86.tar.gz
6b439bb7204362c0af7a654bce24fcf8059e1772b2f0a9e4e1f8a0b8caa85d26  node-v8.9.4-sunos-x86.tar.xz
729b44b32b2f82ecd5befac4f7518de0c4e3add34e8fe878f745740a66cbbc01  node-v8.9.4.tar.gz
6cdcde9c9c1ca9f450a0b24eafa229ca759e576daa0fae892ce74d541ecdc86f  node-v8.9.4.tar.xz
15a847a28358f9ae40bae42f49b033b0180bc10661632c63a9c8487ae980a8ba  node-v8.9.4-win-x64.7z
48946e99ac4484e071df25741d2300f3a656f476c5ff3f8116a4746c07ebe3b7  node-v8.9.4-win-x64.zip
50ad674fb4c89edf35d3fee2136da86631cb7c0504589eb71ce8a3bb176493ed  node-v8.9.4-win-x86.7z
02e3c65000ac055e05c604aec4cf318212efbd4b60a945ed319072d58314ca32  node-v8.9.4-win-x86.zip
547689da69bacadfee619d208702b73698d14297bd5fef5d80656897989e91b6  node-v8.9.4-x64.msi
f9442188c2f66d167a0ac610dee6d16e226ba28ca93f9569e0276268eb8f85dc  node-v8.9.4-x86.msi
b73841f25d6e75d635770fd1a32e4d74d6ab2feed0fd7708bb40b967ae06f33e  win-x64/node.exe
5439dc6f0d632ecdeb7342986743a03fe0818e34f0a67e38de74fa9c94886a39  win-x64/node.lib
6ab35445dd564978019cf4f3cfe11dd342b8450015fc054df99aa6f35f21736a  win-x64/node_pdb.7z
c064abba981c2373e7e1a8c53b4e4ed1d4927bd9c0f7c065b24dd13b731598bd  win-x64/node_pdb.zip
c8430b20cd067d8784d5faae04f9447987a472b22b6d0a2403ea4362ecd3d0bc  win-x86/node.exe
c4edece2c0aa68e816c4e067f397eb12e9d0c81bb37b3d349dbaf47cf246b0b7  win-x86/node.lib
6a2ee7a0b0074ece27d171418d82ce25a60b87750ec30c5c9fbeaaca8c206fa5  win-x86/node_pdb.7z
1b44176d888c1bc6a6b05fcc6234031b3b8a58da9de8b99661088f998ac5e269  win-x86/node_pdb.zip`;

jest.mock('../../lib/download', () => ({
  async downloadToString({ url }: { url: string }) {
    expect(url).toBe(
      'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v8.9.4/SHASUMS256.txt'
    );
    return mockResponse;
  },
}));

import { ToolingLog } from '@kbn/dev-utils';
import { getNodeShasums } from './node_shasums';

describe('src/dev/build/tasks/nodejs/node_shasums', () => {
  it('resolves to an object with shasums for node downloads for version', async () => {
    const shasums = await getNodeShasums(new ToolingLog(), '8.9.4');
    expect(shasums).toEqual(
      expect.objectContaining({
        'node-v8.9.4.tar.gz': '729b44b32b2f82ecd5befac4f7518de0c4e3add34e8fe878f745740a66cbbc01',
        'node-v8.9.4-win-x64.zip':
          '48946e99ac4484e071df25741d2300f3a656f476c5ff3f8116a4746c07ebe3b7',
      })
    );
  });
});
