import requests

logFile = open('/var/log/probe/KibanaStartup.log', 'w')

res = requests.get('http://localhost:9200/_cat/indices/.kibana_*')
content = res.content
kibanaIndices = []

for indexData in content.split(" "):
   if ".kibana" in indexData:
      kibanaIndices.append(indexData)

kibanaIndices = sorted(kibanaIndices, key=lambda index: int(index.split("_")[1]))
print >>logFile, "Removing .kibana_1 index and current index {} from list to delete.".format(kibanaIndices[-1])
kibanaIndices.remove(".kibana_1")
kibanaIndices = kibanaIndices[:-1]
print >>logFile, "Deleting indices: {}".format(kibanaIndices)

for index in kibanaIndices:
   url = "http://localhost:9200/{}".format(index)
   res = requests.delete(url)
   if res.status_code != 200:
      print >>logFile, "Could not delete {}".format(url)

logFile.close()
