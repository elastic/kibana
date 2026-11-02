# Dynamic connector type smoke test

This guide checks dynamic connector type registration and action execution against a local mock server.

## 1. Start the mock server

Run this in a terminal and leave it open. It listens on port `8089`, logs each request, and returns JSON.

```bash
node -e 'require("http").createServer((req,res)=>{let body="";req.on("data",c=>body+=c);req.on("end",()=>{console.log(new Date().toISOString(),req.method,req.url,body);res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,action:req.url}));});}).listen(8089,"0.0.0.0",()=>console.log("Mock server listening on :8089"));'
```

If Kibana runs in a container, set `MOCK_URL` to an address reachable from that container, for example `http://host.docker.internal:8089`.

## 2. Set Kibana connection details

Run these commands in another terminal. Replace the password as needed.

```bash
export KBN='http://localhost:5601'
export KBN_AUTH='elastic:changeme'
export MOCK_URL='http://localhost:8089'
```

## 3. Register the connector type

The registration endpoint requires superuser access. Registration is in memory and is lost when Kibana restarts.

```bash
curl -u "$KBN_AUTH" \
  -X POST "$KBN/api/actions/connector_types" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  --data "{\
    \"id\":\".acme\",\
    \"displayName\":\"Acme\",\
    \"description\":\"Acme mock connector\",\
    \"config\":[{\"name\":\"baseUrl\",\"type\":\"string\",\"required\":true,\"label\":\"Mock server URL\"}],\
    \"auth\":{\"type\":\"none\"},\
    \"actions\":{\
      \"ping\":{\"description\":\"Send a ping to the mock server\",\"scope\":\"read\",\"input\":[],\"request\":{\"method\":\"GET\",\"url\":\"${MOCK_URL}/ping\"}},\
      \"echo\":{\"description\":\"Send a message to the mock server\",\"scope\":\"write\",\"input\":[{\"name\":\"message\",\"type\":\"string\",\"required\":true,\"label\":\"Message\"}],\"request\":{\"method\":\"POST\",\"url\":\"${MOCK_URL}/echo\",\"body\":{\"message\":\"{{params.message}}\"}}}\
    }\
  }"
```

The response should contain `{"id":".acme"}`. A `409` means this connector type is already registered in this Kibana process.

## 4. Create a connector instance

```bash
curl -u "$KBN_AUTH" \
  -X POST "$KBN/api/actions/connector" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  --data "{\"connector_type_id\":\".acme\",\"name\":\"Acme mock\",\"config\":{\"baseUrl\":\"$MOCK_URL\"},\"secrets\":{\"authType\":\"none\"}}"
```

Copy the returned `id` and set it here:

```bash
export CONNECTOR_ID='<returned-id>'
```

## 5. Execute both actions

```bash
curl -u "$KBN_AUTH" \
  -X POST "$KBN/api/actions/connector/$CONNECTOR_ID/_execute" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  --data '{"params":{"subAction":"ping","subActionParams":{}}}'

curl -u "$KBN_AUTH" \
  -X POST "$KBN/api/actions/connector/$CONNECTOR_ID/_execute" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  --data '{"params":{"subAction":"echo","subActionParams":{"message":"hello from Kibana"}}}'
```

## 6. Check the mock server output

The mock server terminal should show:

```text
GET /ping
POST /echo {"message":"hello from Kibana"}
```

If the execution calls succeed but no requests appear, check that `MOCK_URL` is reachable from the Kibana process. `localhost` inside a container points to that container.
