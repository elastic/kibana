export type SynthtraceScenario = {
  instanceName: string;
  environment: string;
  isDistributedTracing: boolean;
  service?: Service;
};

export type ElasticAgentName =
  | 'go'
  | 'java'
  | 'js-base'
  | 'iOS/swift'
  | 'rum-js'
  | 'nodejs'
  | 'python'
  | 'dotnet'
  | 'ruby'
  | 'php'
  | 'android/java';

export type Service = {
  environment?: string;
  name: string;
  agentName: ElasticAgentName;
  children?: Array<Transaction | Span>;
};

export interface Transaction {
  name: string;
  repeat?: number;
  children: Array<Transaction | Span | Service>;
}

export interface Span {
  name: string;
  type: string;
  subtype: string;
  repeat?: number;
  children?: Array<Transaction | Span | Service>;
}
// const example = {
//   instanceName: "1",
//   environment: "prod",
//   service: {
//     name: "synth-rum",
//     agentName: "rum",
//     colo: "green",
//     children: [
//       {
//         //transaction
//         name: "1rpm/1100ms",
//         children: [
//           {
//             //transaction
//             name: "GET /nodejs/users",
//             repeat: 10,
//             children: [
//               {
//                 //Service
//                 name: "synth-node",
//                 agentName: "nodeJs",
//                 color: "blue",
//                 children: [
//                   {
//                     //Transaction
//                     name: "GET /nodejs/users",
//                     children: [
//                       {
//                         //SPAN
//                         name: "GET user*/_search",
//                         type: "DB",
//                         subtype: "elasticsearc"
//                       }
//                     ]
//                   }
//                 ]
//               }
//             ]
//           },
//           {
//             //transaction
//             name: "GET nodejs/products",
//             repeat: 10
//           }
//         ]
//       }
//     ]
//   }
// };
