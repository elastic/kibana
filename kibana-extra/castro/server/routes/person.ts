import * as Hapi from "hapi";

interface Person {
    firstName?: string;
    lastName?: string;
}

export default function (server: Hapi.Server) {
    // Create
    server.route({
        path: '/api/castro/person/{id}',
        method: 'POST',
        handler: async function (req: Hapi.Request, reply: any) {
            const id = req.params.id;
            const person = <Person>req.payload;

            const es = req.server.plugins.elasticsearch.getCluster("data");
            // const client = req.getSavedObjectsClient();
            const {callWithRequest} = es;

            const config = req.server.config();
            const index = config.get('castro.index');

            callWithRequest(req, 'create', {
                index,
                type: 'person',
                id,
                body: JSON.stringify(person)
            }).then(function (response: any) {
                reply(response);
            });
        }
    });

    // console.log("");

    // Read
    server.route({
        path: '/api/castro/person/{id}',
        method: 'GET',
        handler: async function (req: Hapi.Request, reply: any) {

            const config = req.server.config();
            const index = config.get('castro.index');

            // Example to read config items.
            console.log("castro config: ");
            console.log(config.get('castro.index'));
            console.log(config.get('castro.fromyaml'));

            const id = req.params.id;
            const es = req.server.plugins.elasticsearch.getCluster("data");
            // const client = req.getSavedObjectsClient();
            const {callWithRequest} = es;
            callWithRequest(req, 'get', {
                index,
                type: 'person',
                id
            }).then(function (response: any) {
                reply(response)
            });
        }
    });

    // Update
    server.route({
        path: '/api/castro/person/{id}',
        method: 'PUT',
        handler: async function (req: Hapi.Request, reply: any) {
            const id = req.params.id;
            const body = req.payload;

            const es = req.server.plugins.elasticsearch.getCluster("data");
            // const client = req.getSavedObjectsClient();
            const {callWithRequest} = es;

            const config = req.server.config();
            const index = config.get('castro.index');

            callWithRequest(req, 'update', {
                index,
                type: 'person',
                id,
                body
            }).then(function (response: any) {
                reply(response)
            });

        }
    });

    // Delete
    server.route({
        path: '/api/castro/person/{id}',
        method: 'DELETE',
        handler: async function (req: Hapi.Request, reply: any) {
            const id = req.params.id;
            const es = req.server.plugins.elasticsearch.getCluster("data");
            // const client = req.getSavedObjectsClient();
            const {callWithRequest} = es;

            const config = req.server.config();
            const index = config.get('castro.index');

            callWithRequest(req, 'delete', {
                index,
                type: 'person',
                id
            }).then(function (response: any) {
                reply(response)
            });
        }
    });
}